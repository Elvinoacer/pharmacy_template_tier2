import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { Pagination } from "@/app/components/Pagination";
import { parsePageParam } from "@/app/lib/pagination";
import { formatDate } from "@/app/lib/time";
import {
  FileText,
  Plus,
  Search,
  X,
  Activity,
  DollarSign,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  HelpCircle,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Filter,
  ArrowRight,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Building2,
  UploadCloud,
  QrCode,
  Users,
} from "lucide-react";
import {
  INTAKE_CHANNEL_LABELS,
  PRIMARY_LIFECYCLE_STAGES,
  EXCEPTION_LIFECYCLE_STATUSES,
  LIFECYCLE_STATUS_LABELS,
} from "@/app/lib/services/prescription-lifecycle";
import {
  PrescriptionLifecycleStatus,
  PrescriptionIntakeChannel,
} from "@/app/generated/prisma/enums";

export const metadata = { title: "Prescriptions & Lifecycle Management" };

const PAGE_SIZE = 25;

// Channel icon helper
function getChannelIcon(channelKey: string) {
  switch (channelKey) {
    case "whatsapp":
      return MessageSquare;
    case "email":
      return Inbox;
    case "patient_upload":
      return UploadCloud;
    case "doctor_referral":
      return Stethoscope;
    case "hospital_system":
      return Building2;
    case "electronic_prescription":
      return QrCode;
    case "phone_communication":
      return PhoneCall;
    case "in_person_consultation":
      return Users;
    default:
      return FileText;
  }
}

export default async function AdminPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; stage?: string; channel?: string; page?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const q = sp.q?.trim() || undefined;
  const status = sp.status || undefined;
  const stage = sp.stage || undefined;
  const channel = sp.channel || undefined;

  const where: Prisma.PrescriptionWhereInput = {
    ...(stage
      ? { lifecycleStatus: stage as PrescriptionLifecycleStatus }
      : status
      ? { status: status as "active" | "on_hold" | "expired" | "discontinued" }
      : {}),
    ...(channel
      ? { intakeChannel: channel as PrescriptionIntakeChannel }
      : {}),
    ...(q
      ? {
          OR: [
            { medicineName: { contains: q, mode: "insensitive" as const } },
            { rxReference: { contains: q, mode: "insensitive" as const } },
            { prescriber: { contains: q, mode: "insensitive" as const } },
            { customer: { fullName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const includeBase = {
    customer: { select: { id: true, fullName: true, phone: true } },
    _count: { select: { refillRequests: true } },
  } as const;

  let total = 0;
  let prescriptions: any[] = [];
  let stageCounts: Record<string, number> = {};
  let channelCounts: Record<string, number> = {};
  let totalUnderReview = 0;
  let totalUnclear = 0;
  let totalReady = 0;
  let totalOnHold = 0;

  async function loadPrescriptions(skip = 0) {
    try {
      return await prisma.prescription.findMany({
        where,
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          medication: { select: { currentStock: true, price: true } },
          _count: { select: { refillRequests: true, adherence: true, clarificationLogs: true } },
        },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      });
    } catch {
      const rows = await prisma.prescription.findMany({
        where,
        include: includeBase,
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip,
      });
      return rows.map((r) => ({
        ...r,
        medication: null,
        _count: { refillRequests: r._count.refillRequests, adherence: 0, clarificationLogs: 0 },
      }));
    }
  }

  try {
    const [count, rows, groupedStages, groupedChannels, unclearCount, reviewCount, readyCount, holdCount] = await Promise.all([
      prisma.prescription.count({ where }),
      loadPrescriptions(0),
      prisma.prescription.groupBy({ by: ["lifecycleStatus"], _count: true }),
      prisma.prescription.groupBy({ by: ["intakeChannel"], _count: true }),
      prisma.prescription.count({ where: { isUnclear: true } }),
      prisma.prescription.count({ where: { lifecycleStatus: PrescriptionLifecycleStatus.under_review } }),
      prisma.prescription.count({ where: { lifecycleStatus: PrescriptionLifecycleStatus.ready } }),
      prisma.prescription.count({ where: { lifecycleStatus: PrescriptionLifecycleStatus.on_hold } }),
    ]);
    total = count;
    prescriptions = rows;
    totalUnclear = unclearCount;
    totalUnderReview = reviewCount;
    totalReady = readyCount;
    totalOnHold = holdCount;

    for (const g of groupedStages) {
      if (g.lifecycleStatus) stageCounts[g.lifecycleStatus] = g._count;
    }
    for (const g of groupedChannels) {
      if (g.intakeChannel) channelCounts[g.intakeChannel] = g._count;
    }
  } catch (err) {
    console.error("[admin/prescriptions] Failed to load:", err);
  }

  const page = parsePageParam(sp.page, total, PAGE_SIZE);
  const paged =
    page === 1
      ? prescriptions
      : await loadPrescriptions((page - 1) * PAGE_SIZE).catch(() => []);

  // Build query string helper
  function buildFilterHref(params: { stage?: string | null; channel?: string | null }) {
    const nextStage = params.stage !== undefined ? params.stage : stage;
    const nextChannel = params.channel !== undefined ? params.channel : channel;
    const searchPart = q ? `&q=${encodeURIComponent(q)}` : "";
    const stagePart = nextStage ? `&stage=${nextStage}` : "";
    const channelPart = nextChannel ? `&channel=${nextChannel}` : "";
    return `/admin/prescriptions?${(searchPart + stagePart + channelPart).replace(/^&/, "") || ""}`;
  }

  return (
    <AdminShell
      user={user}
      title="Prescription Worklist"
      subtitle={`${total} prescriptions · 9-channel intake, clinical review, verification & dispensing`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/admin/prescriptions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-900/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> New Prescription Intake
          </Link>
        </div>
      }
    >
      {/* ── KPI Overview Strip ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold admin-soft">Total Prescriptions</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold admin-text">{total}</p>
          <span className="text-[10px] admin-soft">Active database records</span>
        </div>

        <Link
          href={buildFilterHref({ stage: "under_review" })}
          className="group rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm transition hover:border-blue-500/40 hover:bg-blue-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Under Review</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-blue-900 dark:text-blue-200">{totalUnderReview}</p>
          <span className="text-[10px] text-blue-700/80 dark:text-blue-300/80 group-hover:underline">
            Awaiting pharmacist review →
          </span>
        </Link>

        <Link
          href={buildFilterHref({ stage: "ready" })}
          className="group rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm transition hover:border-emerald-500/40 hover:bg-emerald-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Ready for Dispense</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-emerald-900 dark:text-emerald-200">{totalReady}</p>
          <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 group-hover:underline">
            Approved &amp; packed →
          </span>
        </Link>

        <Link
          href="/admin/prescriptions?q=unclear"
          className="group rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm transition hover:border-amber-500/40 hover:bg-amber-500/10"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Unclear Scripts</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600">
              <HelpCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-amber-900 dark:text-amber-200">{totalUnclear}</p>
          <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80 group-hover:underline">
            Needs doctor clarification →
          </span>
        </Link>

        <Link
          href={buildFilterHref({ stage: "on_hold" })}
          className="group rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 shadow-sm transition hover:border-rose-500/40 hover:bg-rose-500/10 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">On Hold</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-rose-900 dark:text-rose-200">{totalOnHold}</p>
          <span className="text-[10px] text-rose-700/80 dark:text-rose-300/80 group-hover:underline">
            Clinical holds / issues →
          </span>
        </Link>
      </div>

      {/* ── Status Lifecycle Pipeline (Primary Progression) ── */}
      <div className="mb-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" /> Progression Pipeline
          </span>
          {stage && (
            <Link
              href={buildFilterHref({ stage: null })}
              className="text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Clear stage filter ✕
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildFilterHref({ stage: null })}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
              !stage
                ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
            }`}
          >
            All Stages <span className="rounded-full bg-black/15 px-1.5 py-0.2 text-[10px]">{total}</span>
          </Link>

          {PRIMARY_LIFECYCLE_STAGES.map((s) => {
            const info = LIFECYCLE_STATUS_LABELS[s];
            const isSelected = stage === s;
            const count = stageCounts[s] || 0;
            return (
              <Link
                key={s}
                href={buildFilterHref({ stage: s })}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                  isSelected
                    ? "bg-[var(--admin-accent)] text-[var(--admin-btn-fg)] ring-2 ring-[var(--admin-accent)]/20"
                    : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
                }`}
              >
                {info.label}
                {count > 0 ? (
                  <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${isSelected ? "bg-white/25 text-white" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"}`}>
                    {count}
                  </span>
                ) : (
                  <span className="opacity-40 text-[10px]">0</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Exception / Terminal Statuses ── */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--admin-border)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mr-1 inline-flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Exceptions:
          </span>
          {EXCEPTION_LIFECYCLE_STATUSES.map((s) => {
            const info = LIFECYCLE_STATUS_LABELS[s];
            const isSelected = stage === s;
            const count = stageCounts[s] || 0;
            return (
              <Link
                key={s}
                href={buildFilterHref({ stage: s })}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition ${
                  isSelected
                    ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30"
                    : "bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/20"
                }`}
              >
                {info.label}
                <span className="rounded-full bg-black/15 px-1.5 text-[10px]">{count}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── 9-Channel Intake Horizontal Selector ── */}
      <div className="mb-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-card)] p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider admin-soft inline-flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-emerald-600" /> Filter by Intake Arrival Channel
          </span>
          {channel && (
            <Link
              href={buildFilterHref({ channel: null })}
              className="text-[11px] font-semibold text-rose-600 hover:underline"
            >
              All channels ✕
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={buildFilterHref({ channel: null })}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              !channel
                ? "bg-emerald-600 text-white shadow-sm font-bold"
                : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" /> All Channels ({total})
          </Link>
          {Object.entries(INTAKE_CHANNEL_LABELS).map(([chKey, chInfo]) => {
            const isSelected = channel === chKey;
            const count = channelCounts[chKey] || 0;
            const ChannelIcon = getChannelIcon(chKey);
            return (
              <Link
                key={chKey}
                href={buildFilterHref({ channel: chKey })}
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-emerald-600 text-white shadow-sm font-bold ring-2 ring-emerald-600/30"
                    : "bg-[var(--admin-inset)] admin-text hover:bg-[var(--admin-inset-2)] border border-[var(--admin-border)]"
                }`}
              >
                <ChannelIcon className="h-3.5 w-3.5 text-[#0d6e5a]" />
                <span>{chInfo.label}</span>
                {count > 0 && (
                  <span className={`rounded-full px-1.5 text-[10px] ${isSelected ? "bg-white/20 text-white" : "bg-black/10 admin-soft"}`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <form className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 admin-soft" />
          <input
            name="q"
            defaultValue={q || ""}
            placeholder="Search patient name, medicine, Rx ref, doctor, or KMPDC #…"
            className="input-admin pl-10 text-xs shadow-sm"
          />
          {q && (
            <Link
              href={buildFilterHref({})}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 admin-soft hover:bg-[var(--admin-inset-2)] hover:text-[var(--admin-text)]"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-bold text-[var(--admin-btn-fg)] shadow-sm transition hover:brightness-110"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
      </form>

      {/* ── Prescription Table ── */}
      <AdminPanel>
        {paged.length === 0 ? (
          <AdminEmptyState
            icon={FileText}
            title="No prescriptions found"
            description="No prescriptions match your selected stage, intake channel, or search filter."
          />
        ) : (
          <div className="overflow-x-auto scroll-admin">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>Patient &amp; Identity</th>
                  <th>Medication &amp; Stock</th>
                  <th>Prescriber &amp; Facility</th>
                  <th>Intake Channel</th>
                  <th>Dose &amp; Supply</th>
                  <th>Refill Status</th>
                  <th>Lifecycle Stage</th>
                  <th>Clinical Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => {
                  const chInfo = INTAKE_CHANNEL_LABELS[p.intakeChannel as keyof typeof INTAKE_CHANNEL_LABELS] || INTAKE_CHANNEL_LABELS.in_person_consultation;
                  const stageKey = p.lifecycleStatus || (p.status === "on_hold" ? "on_hold" : "received");
                  const stageMeta = LIFECYCLE_STATUS_LABELS[stageKey as keyof typeof LIFECYCLE_STATUS_LABELS] || LIFECYCLE_STATUS_LABELS.received;
                  const ChannelIcon = getChannelIcon(p.intakeChannel || "in_person_consultation");

                  return (
                    <tr key={p.id} className="hover:bg-[var(--admin-hover)] transition">
                      {/* Patient */}
                      <td>
                        {p.customer ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/admin/customers/${p.customer.id}`}
                                className="font-bold text-xs admin-text hover:admin-accent-text hover:underline"
                              >
                                {p.customer.fullName}
                              </Link>
                              {p.patientVerified && (
                                <span title="Patient identity verified">
                                  <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                </span>
                              )}
                            </div>
                            {p.customer.phone && (
                              <p className="text-[11px] admin-soft font-mono">{p.customer.phone}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs admin-soft">—</span>
                        )}
                      </td>

                      {/* Medication & Stock */}
                      <td>
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs admin-text">{p.medicineName}</p>
                          <div className="flex items-center gap-1.5">
                            {p.medication ? (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                p.medication.currentStock >= (p.quantity || 1)
                                  ? "text-emerald-600"
                                  : p.medication.currentStock > 0
                                  ? "text-amber-600"
                                  : "text-rose-600"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  p.medication.currentStock >= (p.quantity || 1)
                                    ? "bg-emerald-500"
                                    : p.medication.currentStock > 0
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`} />
                                {p.medication.currentStock} in stock
                              </span>
                            ) : (
                              <span className="text-[10px] admin-soft font-mono">
                                {p.rxReference || "Rx"}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Prescriber */}
                      <td>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-semibold admin-text">
                              {p.prescriber || "Staff Prescribed"}
                            </p>
                            {p.prescriberVerified && (
                              <span title="Prescriber verified">
                                <Stethoscope className="h-3 w-3 text-emerald-600" />
                              </span>
                            )}
                          </div>
                          {p.prescriberLicense && (
                            <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                              {p.prescriberLicense}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Intake Channel */}
                      <td>
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-inset)] px-2.5 py-1 text-[11px] font-medium admin-text">
                          <ChannelIcon className="h-3 w-3 text-emerald-600" />
                          <span>{chInfo.label}</span>
                        </span>
                      </td>

                      {/* Dosage & Supply */}
                      <td>
                        <p className="text-xs font-semibold admin-text">{p.dosage || "1 dose"}</p>
                        <p className="text-[10px] admin-soft">
                          {p.quantity ?? 1} units · {p.daysSupply ?? 30}d supply
                        </p>
                      </td>

                      {/* Refill status */}
                      <td>
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs font-bold admin-text">
                            {p.refillsRemaining ?? 0} left
                          </span>
                          {p.nextRefillDue && (
                            <p className="text-[10px] admin-muted">
                              Due: {formatDate(p.nextRefillDue)}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Lifecycle Stage */}
                      <td>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${stageMeta.badgeClass}`}>
                          {stageMeta.label}
                        </span>
                      </td>

                      {/* Clinical Status / Flags */}
                      <td>
                        <div className="flex flex-col gap-1 text-[10px]">
                          {p.isUnclear ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">
                              <HelpCircle className="h-3 w-3" /> Unclear script
                            </span>
                          ) : p._count?.clarificationLogs > 0 ? (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-semibold">
                              <PhoneCall className="h-3 w-3" /> {p._count.clarificationLogs} call(s)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action */}
                      <td className="text-right">
                        <Link
                          href={`/admin/prescriptions/${p.id}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/admin/prescriptions"
        queryParams={{ q, status, stage, channel }}
        variant="admin"
      />
    </AdminShell>
  );
}
