import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import {
  adminDeletePrescriptionAction,
  adminDispatchPrescriptionAction,
} from "@/app/actions/admin";
import { AdminPanel, AdminEmptyState } from "@/app/components/admin/AdminUI";
import { AdminShell } from "@/app/components/admin/AdminShell";
import { formatDateTime, formatDate } from "@/app/lib/time";
import { Markdown } from "@/app/components/Markdown";
import {
  calculatePrescriptionMetrics,
  parseDosageFormula,
  getScheduleForPrescription,
} from "@/app/lib/services/medication-schedule";
import {
  ArrowLeft,
  Pill,
  FileText,
  Calendar,
  DollarSign,
  Activity,
  Trash2,
  Sparkles,
  Truck,
  Check,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  ShieldAlert,
  Clock,
  User,
  Hash,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import ConfirmSubmitButton from "@/app/components/admin/ConfirmSubmitButton";
import { PendingSubmitButton } from "@/app/components/PendingSubmitButton";

export const metadata = { title: "Prescription Analytics & Detail" };

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30",
  on_hold: "bg-amber-500/15 text-amber-700 border border-amber-500/30",
  expired: "bg-slate-500/15 text-slate-600 border border-slate-500/30",
  discontinued: "bg-rose-500/15 text-rose-600 border border-rose-500/30",
};

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;

  const prescription = await prisma.prescription
    .findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        refillRequests: { orderBy: { createdAt: "desc" }, take: 10 },
        adherence: { orderBy: { takenOn: "desc" }, take: 30 },
        doseLogs: { orderBy: { scheduledDate: "desc" }, take: 30 },
        doseSchedule: { where: { active: true }, orderBy: { timeOfDay: "asc" } },
        medication: { include: { medicationMaster: { select: { name: true } } } },
        dispatchedBy: { select: { id: true, email: true } },
      },
    })
    .catch(async () => {
      const base = await prisma.prescription.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, fullName: true, phone: true } },
          refillRequests: { orderBy: { createdAt: "desc" }, take: 10 },
          medication: { include: { medicationMaster: { select: { name: true } } } },
          dispatchedBy: { select: { id: true, email: true } },
        },
      });
      if (!base) return null;
      return {
        ...base,
        adherence: [] as { id: string; status: string; takenOn: Date; notes: string | null }[],
        doseLogs: [] as { id: string; scheduledDate: Date; scheduledTime: string | null; status: string; recordedBy: string; notes: string | null }[],
        doseSchedule: [] as { id: string; timeOfDay: string; label: string | null }[],
      };
    });
  if (!prescription) notFound();

  // Parse dosage formula & calculate operational metrics
  const formula = parseDosageFormula(prescription.dosage, prescription.schedule);
  const metrics = calculatePrescriptionMetrics(
    {
      startDate: prescription.startDate,
      createdAt: prescription.createdAt,
      dosage: prescription.dosage,
      schedule: prescription.schedule,
      quantity: prescription.quantity,
    },
    prescription.doseLogs.length > 0
      ? prescription.doseLogs
      : prescription.adherence.map((a) => ({ scheduledDate: a.takenOn, scheduledTime: null, status: a.status })),
    prescription.doseSchedule.map((s) => ({ timeOfDay: s.timeOfDay, label: s.label || undefined }))
  );

  const percentRemaining = Math.min(
    100,
    Math.max(0, Math.round((metrics.unitsRemaining / metrics.totalQuantity) * 100))
  );

  // Generate 14-day visual matrix data
  const last14Days: Array<{ date: string; status: string }> = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    
    const logged = prescription.doseLogs.find((l) => {
      const lStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(l.scheduledDate));
      return lStr === dateStr;
    }) || prescription.adherence.find((a) => {
      const aStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(a.takenOn));
      return aStr === dateStr;
    });

    last14Days.push({
      date: dateStr,
      status: logged ? logged.status : "none",
    });
  }

  // AI analysis prompt input
  const analysisInput = {
    medicineName: prescription.medicineName,
    adherenceRate: metrics.adherenceRate,
    missedCount: metrics.missedDosesCount,
    skippedCount: metrics.skippedDosesCount,
    lateCount: metrics.lateDosesCount,
    logCount: metrics.expectedDosesToDate,
    daysSupply: prescription.daysSupply,
    nextRefillDue: prescription.nextRefillDue,
    refillsRemaining: prescription.refillsRemaining ?? 0,
    dosage: prescription.dosage,
    schedule: prescription.schedule,
    unitsRemaining: metrics.unitsRemaining,
    daysRemaining: metrics.daysRemaining,
  };

  const analysis = await analyzeAdherenceWithAi(analysisInput);

  return (
    <AdminShell
      user={user}
      title={prescription.medicineName}
      subtitle={`Customer: ${prescription.customer?.fullName || "Unassigned"}`}
    >
      {/* Top Operations Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-inset-2)]">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/prescriptions"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-black/40 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white border border-black/5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All prescriptions
          </Link>
          {prescription.customer && (
            <Link
              href={`/admin/customers/${prescription.customer.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-black/40 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white border border-black/5"
            >
              <User className="h-3.5 w-3.5" /> Customer profile
            </Link>
          )}
          {prescription.medication && (
            <Link
              href={`/admin/medications/${prescription.medication.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-black/40 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white border border-black/5"
            >
              <Pill className="h-3.5 w-3.5" /> Linked Catalogue Item
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dispatch Button */}
          {!prescription.dispatchedAt ? (
            <form action={adminDispatchPrescriptionAction}>
              <input type="hidden" name="id" value={prescription.id} />
              <PendingSubmitButton
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                pendingChildren={
                  <>
                    <Truck className="h-3.5 w-3.5 animate-pulse" /> Dispatching…
                  </>
                }
              >
                <Truck className="h-3.5 w-3.5" /> Dispatch & Deduct Stock
              </PendingSubmitButton>
            </form>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-500/30">
              <Check className="h-3.5 w-3.5" /> Dispatched {formatDateTime(prescription.dispatchedAt)}
              {prescription.dispatchedBy && (
                <span className="opacity-75">by {prescription.dispatchedBy.email}</span>
              )}
            </span>
          )}

          <form action={adminDeletePrescriptionAction}>
            <input type="hidden" name="id" value={prescription.id} />
            <ConfirmSubmitButton
              message="Delete this prescription? Adherence logs will also be removed."
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>

      {/* SECTION 1: ANALYTICAL INTELLIGENCE COMMAND CENTER (Data Analyzed FIRST) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Calculated Adherence Score */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--admin-inset-2)] bg-gradient-to-br from-[var(--admin-inset)] to-white dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">
              Strict Adherence Rate
            </span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
              metrics.adherenceRate >= 85
                ? "bg-emerald-500/15 text-emerald-700"
                : metrics.adherenceRate >= 70
                ? "bg-amber-500/15 text-amber-700"
                : "bg-rose-500/15 text-rose-700"
            }`}>
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${
              metrics.adherenceRate >= 85
                ? "text-emerald-700"
                : metrics.adherenceRate >= 70
                ? "text-amber-700"
                : "text-rose-700"
            }`}>
              {metrics.adherenceRate}%
            </span>
            <span className="text-xs admin-soft">
              ({metrics.takenDosesCount}/{metrics.expectedDosesToDate} doses)
            </span>
          </div>
          <p className="mt-1.5 text-[11px] admin-soft">
            Calculated strictly against elapsed dose slots. Unconfirmed past due = missed.
          </p>
        </div>

        {/* Calculated Pill Inventory Gauge */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--admin-inset-2)] bg-gradient-to-br from-[var(--admin-inset)] to-white dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">
              Calculated Pill Supply
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-700">
              <PackageCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold admin-text">{metrics.unitsRemaining}</span>
            <span className="text-xs admin-soft">/ {metrics.totalQuantity} units left</span>
          </div>

          <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all ${
                percentRemaining > 30
                  ? "bg-gradient-to-r from-emerald-500 to-[#0d6e5a]"
                  : percentRemaining > 15
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse"
              }`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] admin-soft">
            ~ {metrics.daysRemaining} days supply left (Formula: {formula.formulaLabel})
          </p>
        </div>

        {/* Dose Slot Execution Breakdown */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--admin-inset-2)] bg-gradient-to-br from-[var(--admin-inset)] to-white dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Missed & Overdue Doses
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-700">{metrics.missedDosesCount}</span>
            <span className="text-xs text-rose-600">missed</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] admin-soft">
            <span>Taken: {metrics.takenDosesCount}</span>
            <span>Late: {metrics.lateDosesCount}</span>
            <span>Skipped: {metrics.skippedDosesCount}</span>
          </div>
        </div>

        {/* Refill Forecast & Financials */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--admin-inset-2)] bg-gradient-to-br from-[var(--admin-inset)] to-white dark:to-slate-900 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">
              Refill Forecast
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-700">
              <Calendar className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold admin-text">{prescription.refillsRemaining ?? 0}</span>
            <span className="text-xs admin-soft">refills left</span>
          </div>
          <p className="mt-1.5 text-[11px] admin-soft">
            {prescription.nextRefillDue ? `Next due: ${formatDate(prescription.nextRefillDue)}` : "No refill due date set"}
          </p>
        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: ANALYTICS FIRST (COL 2), SECONDARY SPECS (COL 1) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT / MAIN COLUMN (2 COLS): VISUAL MATRIX, AI ANALYSIS & DOSE LOGS */}
        <div className="space-y-6 lg:col-span-2">
          {/* 14-Day Visual Adherence Heatmap Matrix */}
          <AdminPanel
            title="14-Day Visual Adherence Calendar"
            description="Color-coded dose confirmation status per day"
          >
            <div className="grid grid-cols-7 gap-2 sm:grid-cols-14">
              {last14Days.map((d) => {
                const colors: Record<string, string> = {
                  taken: "bg-emerald-500 text-white font-bold shadow-xs",
                  late: "bg-amber-500 text-white font-bold shadow-xs",
                  missed: "bg-rose-500 text-white font-bold shadow-xs",
                  skipped: "bg-slate-400 text-white",
                  none: "bg-[var(--admin-inset)] admin-soft border border-black/5",
                };
                return (
                  <div
                    key={d.date}
                    className={`rounded-2xl px-1.5 py-3 text-center transition ${colors[d.status] || colors.none}`}
                    title={`${d.date}: ${d.status}`}
                  >
                    <p className="text-[9px] uppercase opacity-75 font-semibold">
                      {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" })}
                    </p>
                    <p className="text-xs font-extrabold mt-0.5">
                      {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { day: "numeric", timeZone: "Africa/Nairobi" })}
                    </p>
                    <p className="mt-1 text-[9px] font-extrabold uppercase tracking-tighter">
                      {d.status === "none" ? "—" : d.status}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-inset-2)] pt-3 text-[11px] admin-soft">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span> Taken</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span> Late</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span> Missed</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span> Skipped</span>
              </div>

              <span>Calculated from {metrics.expectedDosesToDate} expected slots</span>
            </div>
          </AdminPanel>

          {/* AI Clinical Adherence Analysis */}
          <AdminPanel
            title="AI Clinical Adherence Analysis"
            description="Automated clinical observations, adherence trends & interventions"
            action={
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> AI Clinical Intelligence
              </span>
            }
          >
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs admin-text">
              <Markdown>{analysis}</Markdown>
            </div>
          </AdminPanel>

          {/* Granular Dose Logs */}
          <AdminPanel
            title="Dose Confirmation Audit Trail"
            description={`${prescription.doseLogs.length || prescription.adherence.length} most recent entries`}
            action={
              <Link
                href={`/admin/prescriptions/${prescription.id}/log`}
                className="text-xs font-bold admin-accent-text hover:underline inline-flex items-center gap-1"
              >
                View full log <ExternalLink className="h-3 w-3" />
              </Link>
            }
          >
            {prescription.doseLogs.length === 0 && prescription.adherence.length === 0 ? (
              <AdminEmptyState
                icon={Activity}
                title="No dose logs recorded yet"
                description="When the patient logs doses or reminders auto-expire, entries will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {(prescription.doseLogs.length > 0 ? prescription.doseLogs : prescription.adherence).map((a: any) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--admin-inset)] px-4 py-2.5 text-xs border border-[var(--admin-inset-2)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${
                        a.status === "taken" ? "bg-emerald-100 text-emerald-700"
                        : a.status === "late" ? "bg-amber-100 text-amber-700"
                        : a.status === "missed" ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600"
                      }`}>
                        {a.status === "taken" && <Check className="h-4 w-4" />}
                        {a.status === "late" && <Clock className="h-4 w-4" />}
                        {a.status === "missed" && <AlertTriangle className="h-4 w-4" />}
                        {a.status === "skipped" && <Trash2 className="h-4 w-4" />}
                      </span>

                      <div>
                        <p className="font-bold admin-text capitalize">
                          {a.status} {a.scheduledTime ? `@ ${a.scheduledTime}` : ""}
                        </p>
                        <p className="text-[10px] admin-soft">
                          {formatDate(a.scheduledDate || a.takenOn)}
                          {a.recordedBy ? ` · Logged by ${a.recordedBy}` : ""}
                        </p>
                      </div>
                    </div>

                    {a.notes && (
                      <span className="rounded-lg bg-white/60 dark:bg-black/40 px-2.5 py-1 text-[11px] admin-muted italic">
                        "{a.notes}"
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>

          {/* Refill Request History */}
          <AdminPanel title="Refill Fulfillment History" description={`${prescription.refillRequests.length} past refills`}>
            {prescription.refillRequests.length === 0 ? (
              <p className="py-4 text-center text-xs admin-soft">No refill requests on file for this prescription.</p>
            ) : (
              <ul className="space-y-2">
                {prescription.refillRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--admin-inset)] px-4 py-2.5 text-xs border border-[var(--admin-inset-2)]">
                    <div>
                      <p className="font-bold admin-text">{r.medicineName}</p>
                      <p className="text-[10px] admin-soft">{formatDateTime(r.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold capitalize text-emerald-700">
                      {r.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminPanel>
        </div>

        {/* RIGHT COLUMN (1 COL): SECONDARY ADMINISTRATIVE SPECS & METADATA */}
        <div className="space-y-6 lg:col-span-1">
          {/* Secondary Administrative Specs Card */}
          <AdminPanel title="Prescription Specifications" description="Administrative & Rx metadata">
            <dl className="space-y-3.5 text-xs">
              <div className="rounded-xl bg-[var(--admin-inset)] p-3 border border-[var(--admin-inset-2)]">
                <p className="text-[10px] font-bold uppercase tracking-wider admin-soft">Medicine & Formula</p>
                <p className="mt-1 font-bold text-sm admin-text">{prescription.medicineName}</p>
                <p className="mt-0.5 text-xs font-semibold text-[#0d6e5a] dark:text-emerald-400">
                  {formula.formulaLabel}
                </p>
                {prescription.dosage && <p className="mt-0.5 text-[11px] admin-muted">{prescription.dosage}</p>}
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Status</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLOR[prescription.status]}`}>
                  {prescription.status.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Rx Reference</span>
                <span className="font-mono font-bold admin-text">{prescription.rxReference || "—"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Prescriber</span>
                <span className="font-semibold admin-text">{prescription.prescriber || "Staff Pharmacist"}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Unit Price / Refill</span>
                <span className="font-bold admin-text">
                  {prescription.unitPrice ? `KES ${Number(prescription.unitPrice).toLocaleString()}` : "Not set"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Refills Remaining</span>
                <span className="font-bold text-sm admin-text">{prescription.refillsRemaining ?? 0}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                <span className="admin-soft font-medium">Course Start Date</span>
                <span className="admin-text font-semibold">{formatDate(prescription.startDate || prescription.createdAt)}</span>
              </div>

              {prescription.endDate && (
                <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                  <span className="admin-soft font-medium">Course End Date</span>
                  <span className="admin-text font-semibold">{formatDate(prescription.endDate)}</span>
                </div>
              )}

              {prescription.nextRefillDue && (
                <div className="flex items-center justify-between py-1 border-b border-[var(--admin-inset-2)]">
                  <span className="admin-soft font-medium">Next Refill Due</span>
                  <span className="text-[#0d6e5a] dark:text-emerald-400 font-bold">{formatDate(prescription.nextRefillDue)}</span>
                </div>
              )}
            </dl>

            {prescription.notes && (
              <div className="mt-4 rounded-xl bg-amber-500/10 p-3 border border-amber-500/20">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Pharmacist Internal Notes</p>
                <p className="mt-1 text-xs text-amber-900">{prescription.notes}</p>
              </div>
            )}
          </AdminPanel>

          {/* Schedule Slots Spec */}
          {prescription.doseSchedule.length > 0 && (
            <AdminPanel title="Configured Schedule Slots" description="Time-of-day slots generated for cron reminders">
              <div className="space-y-2">
                {prescription.doseSchedule.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between rounded-xl bg-[var(--admin-inset)] px-3.5 py-2 text-xs border border-[var(--admin-inset-2)]">
                    <span className="font-mono font-bold text-[#0d6e5a] dark:text-emerald-400">{slot.timeOfDay}</span>
                    <span className="admin-soft font-medium">{slot.label || "Daily Slot"}</span>
                  </div>
                ))}
              </div>
            </AdminPanel>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

async function analyzeAdherenceWithAi(
  input: Parameters<typeof generateAdherenceAnalysis>[0],
): Promise<string> {
  const fallback = generateAdherenceAnalysis(input);
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || input.logCount === 0) return fallback;

  try {
    const Groq = (await import("groq-sdk")).default;
    const groq = new Groq({ apiKey });
    const model = (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim();
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are a clinical pharmacy assistant. Write a concise markdown adherence analysis for a pharmacist. Include: summary, dosage/schedule trends if provided, observation, tiered recommendations, and refill notes. No preamble. Do not invent clinical diagnoses.",
        },
        {
          role: "user",
          content: JSON.stringify(input, null, 2),
        },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    return text || fallback;
  } catch (err) {
    console.error("[adherence AI]", err);
    return fallback;
  }
}

function generateAdherenceAnalysis(input: {
  medicineName: string;
  adherenceRate: number | null;
  missedCount: number;
  skippedCount: number;
  lateCount?: number;
  logCount: number;
  daysSupply: number | null;
  nextRefillDue: Date | null;
  refillsRemaining: number;
  dosage?: string | null;
  schedule?: string | null;
  unitsRemaining?: number;
  daysRemaining?: number;
}): string {
  const {
    medicineName,
    adherenceRate,
    missedCount,
    skippedCount,
    lateCount = 0,
    logCount,
    daysSupply,
    nextRefillDue,
    refillsRemaining,
    dosage,
    schedule,
    unitsRemaining,
    daysRemaining,
  } = input;

  if (logCount === 0) {
    return `### Clinical Status: Awaiting Initial Logs\n\nThe customer has not yet logged doses for **${medicineName}**. Encourage them to use the *Prescriptions* portal — daily logging enables automatic adherence tracking and refill forecasting.`;
  }

  const lines: string[] = [];
  lines.push(`### Adherence & Compliance Analysis`);
  lines.push(
    `Across **${logCount} expected dose slots**, the customer has maintained an adherence rate of **${adherenceRate}%** (${logCount - missedCount - skippedCount} confirmed taken/late, ${missedCount} auto-marked missed, ${skippedCount} skipped${lateCount ? `, ${lateCount} late` : ""}).`
  );
  if (dosage || schedule) {
    lines.push("");
    lines.push(`**Configured Regimen:** ${[dosage, schedule].filter(Boolean).join(" · ")}`);
  }
  if (unitsRemaining !== undefined && daysRemaining !== undefined) {
    lines.push("");
    lines.push(`**Calculated Inventory:** ~**${unitsRemaining} units** remaining (\u2248 **${daysRemaining} days supply**).`);
  }
  lines.push("");

  if (adherenceRate !== null && adherenceRate >= 85) {
    lines.push(`**Observation:** High compliance level. The customer is adhering to their schedule.`);
    lines.push("");
    lines.push(`**Pharmacist Recommendations:**`);
    lines.push(`- Maintain current regimen and dosage schedule.`);
    lines.push(`- Automatic refill reminders active.`);
  } else if (adherenceRate !== null && adherenceRate >= 70) {
    lines.push(`**Observation:** Moderate adherence. Several missed or delayed doses detected.`);
    lines.push("");
    lines.push(`**Pharmacist Recommendations:**`);
    lines.push(`- Contact customer to identify barriers (e.g. forgetfulness, side effects).`);
    lines.push(`- Verify automated push/SMS dose reminders are enabled.`);
  } else {
    lines.push(`**Observation:** Low adherence alert. High proportion of unconfirmed / missed doses — treatment efficacy may be compromised.`);
    lines.push("");
    lines.push(`**Pharmacist Recommendations:**`);
    lines.push(`- **Urgent Pharmacist Follow-Up Required**: Contact patient or assigned caregiver.`);
    lines.push(`- Consider schedule adjustments if current times are inconvenient.`);
  }

  if (nextRefillDue) {
    const days = Math.ceil((nextRefillDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    lines.push("");
    lines.push(`### Refill & Inventory Forecast`);
    if (days <= 3 && days >= 0) {
      lines.push(
        `Next refill is due in **${days} day${days === 1 ? "" : "s"}**. Customer has **${refillsRemaining} refill${refillsRemaining === 1 ? "" : "s"} remaining**.`
      );
    } else if (days < 0) {
      lines.push(
        `**Refill overdue by ${Math.abs(days)} day${days === -1 ? "" : "s"}** — customer should request a refill immediately. **${refillsRemaining} refills remaining**.`
      );
    }
  }

  return lines.join("\n");
}
