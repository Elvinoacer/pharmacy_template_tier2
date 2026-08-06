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
import { PROJECT_TIMEZONE } from "@/app/lib/time";
import { Markdown } from "@/app/components/Markdown";
import {
  calculatePrescriptionMetrics,
  parseDosageFormula,
} from "@/app/lib/services/medication-schedule";
import {
  ArrowLeft,
  Pill,
  Calendar,
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
  ExternalLink,
  CheckCircle2,
  XCircle,
  Minus,
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

type DoseLogRow = {
  id: string;
  scheduledDate: Date;
  scheduledTime: string | null;
  status: string;
  recordedBy: string;
  notes: string | null;
};

function localDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function localNowTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PROJECT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

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
        doseLogs: { orderBy: [{ scheduledDate: "desc" }, { scheduledTime: "desc" }], take: 90 },
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
        doseLogs: [] as DoseLogRow[],
        doseSchedule: [] as { id: string; timeOfDay: string; label: string | null }[],
      };
    });
  if (!prescription) notFound();

  const formula = parseDosageFormula(prescription.dosage, prescription.schedule);
  const scheduleSlots =
    prescription.doseSchedule.length > 0
      ? prescription.doseSchedule.map((s) => ({
          timeOfDay: s.timeOfDay,
          label: s.label || undefined,
        }))
      : formula.slots;

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
      : prescription.adherence.map((a) => ({
          scheduledDate: a.takenOn,
          scheduledTime: null,
          status: a.status,
        })),
    scheduleSlots
  );

  const percentRemaining = Math.min(
    100,
    Math.max(0, Math.round((metrics.unitsRemaining / Math.max(1, metrics.totalQuantity)) * 100))
  );

  // Build last-14-day × slot timeline (clinical priority view)
  const now = new Date();
  const todayStr = localDateStr(now);
  const nowTime = localNowTime();
  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayKeys.push(localDateStr(d));
  }

  const logIndex = new Map<string, DoseLogRow>();
  for (const log of prescription.doseLogs as DoseLogRow[]) {
    const dStr = localDateStr(new Date(log.scheduledDate));
    const t = log.scheduledTime || "_";
    logIndex.set(`${dStr}|${t}`, log);
  }

  type CellStatus = "taken" | "late" | "missed" | "skipped" | "unknown" | "pending" | "none" | "future";
  const timeline: Array<{
    timeOfDay: string;
    label?: string;
    cells: Array<{ date: string; status: CellStatus }>;
  }> = scheduleSlots.map((slot) => ({
    timeOfDay: slot.timeOfDay,
    label: slot.label,
    cells: dayKeys.map((date) => {
      const log =
        logIndex.get(`${date}|${slot.timeOfDay}`) ||
        (scheduleSlots.length === 1 ? logIndex.get(`${date}|_`) : undefined);

      if (log) {
        const s = log.status as CellStatus;
        if (["taken", "late", "missed", "skipped", "unknown"].includes(s)) {
          return { date, status: s };
        }
      }

      // No log yet — infer pending / future / none
      if (date > todayStr) return { date, status: "future" };
      if (date === todayStr && slot.timeOfDay > nowTime) return { date, status: "pending" };
      if (date === todayStr && slot.timeOfDay <= nowTime) return { date, status: "unknown" };
      // Past day with no log = missed for expected slots after course start
      const startStr = localDateStr(new Date(prescription.startDate || prescription.createdAt));
      if (date < startStr) return { date, status: "none" };
      return { date, status: "missed" };
    }),
  }));

  // Today's slot board
  const todaysBoard = scheduleSlots.map((slot) => {
    const log = logIndex.get(`${todayStr}|${slot.timeOfDay}`);
    let status: CellStatus = "pending";
    if (log) {
      status = (["taken", "late", "missed", "skipped", "unknown"].includes(log.status)
        ? log.status
        : "unknown") as CellStatus;
    } else if (slot.timeOfDay <= nowTime) {
      status = "unknown";
    }
    return { ...slot, status, log };
  });

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
    formulaLabel: formula.formulaLabel,
    slots: scheduleSlots.map((s) => s.timeOfDay).join(", "),
  };

  const analysis = await analyzeAdherenceWithAi(analysisInput);

  return (
    <AdminShell
      user={user}
      title={prescription.medicineName}
      subtitle={`${prescription.customer?.fullName || "Unassigned"} · ${formula.formulaLabel}`}
    >
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] p-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/prescriptions"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white dark:bg-black/40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All prescriptions
          </Link>
          {prescription.customer && (
            <Link
              href={`/admin/customers/${prescription.customer.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white dark:bg-black/40"
            >
              <User className="h-3.5 w-3.5" /> Customer
            </Link>
          )}
          {prescription.medication && (
            <Link
              href={`/admin/medications/${prescription.medication.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3 py-1.5 text-xs font-semibold admin-accent-text transition hover:bg-white dark:bg-black/40"
            >
              <Pill className="h-3.5 w-3.5" /> Catalogue
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                <Truck className="h-3.5 w-3.5" /> Dispatch & deduct stock
              </PendingSubmitButton>
            </form>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Dispatched {formatDateTime(prescription.dispatchedAt)}
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

      {/* Priority 1: KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4">
        <KpiCard
          label="Adherence"
          value={`${metrics.adherenceRate}%`}
          hint={`${metrics.takenDosesCount}/${metrics.expectedDosesToDate} doses`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone={metrics.adherenceRate >= 85 ? "good" : metrics.adherenceRate >= 70 ? "warn" : "bad"}
        />
        <KpiCard
          label="Supply left"
          value={String(metrics.unitsRemaining)}
          hint={`~${metrics.daysRemaining}d · ${percentRemaining}%`}
          icon={<PackageCheck className="h-5 w-5" />}
          tone={percentRemaining > 30 ? "info" : percentRemaining > 15 ? "warn" : "bad"}
          bar={percentRemaining}
        />
        <KpiCard
          label="Missed"
          value={String(metrics.missedDosesCount)}
          hint={`Late ${metrics.lateDosesCount} · Skip ${metrics.skippedDosesCount}`}
          icon={<ShieldAlert className="h-5 w-5" />}
          tone="bad"
        />
        <KpiCard
          label="Refills"
          value={String(prescription.refillsRemaining ?? 0)}
          hint={
            prescription.nextRefillDue
              ? `Next ${formatDate(prescription.nextRefillDue)}`
              : "No due date"
          }
          icon={<Calendar className="h-5 w-5" />}
          tone="good"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
        {/* Main clinical column */}
        <div className="space-y-5 lg:col-span-2 lg:space-y-6">
          {/* Priority 2: AI clinical take */}
          <AdminPanel
            title="AI clinical take"
            description="Prioritised observations for the pharmacist"
            action={
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" /> AI
              </span>
            }
          >
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs admin-text sm:text-sm">
              <Markdown>{analysis}</Markdown>
            </div>
          </AdminPanel>

          {/* Priority 3: Today's dose board */}
          <AdminPanel
            title="Today's dose timeline"
            description={`${scheduleSlots.length} slot${scheduleSlots.length === 1 ? "" : "s"} · ${todayStr}`}
          >
            {scheduleSlots.length === 0 ? (
              <AdminEmptyState
                icon={Clock}
                title="No schedule slots"
                description="Set dosage frequency on the prescription to generate time slots."
              />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {todaysBoard.map((slot) => (
                  <div
                    key={slot.timeOfDay}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 ${cellSurface(slot.status)}`}
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-bold admin-text">
                        {slot.timeOfDay}
                        {slot.label ? (
                          <span className="ml-1.5 font-sans text-xs font-medium admin-soft">
                            {slot.label}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[11px] admin-soft">
                        {slot.log?.recordedBy
                          ? `Logged by ${slot.log.recordedBy}`
                          : slot.status === "pending"
                            ? "Not yet due"
                            : "Awaiting confirmation"}
                      </p>
                    </div>
                    <CellBadge status={slot.status} />
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          {/* Priority 4: 14-day per-slot matrix */}
          <AdminPanel
            title="14-day dose matrix"
            description="Each row is a scheduled time · columns are days"
          >
            {timeline.length === 0 ? (
              <p className="py-4 text-center text-xs admin-soft">No schedule configured.</p>
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[640px] border-separate border-spacing-1 text-center">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-[var(--admin-panel)] px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wider admin-soft">
                        Slot
                      </th>
                      {dayKeys.map((d) => {
                        const dayNum = d.slice(8);
                        const isToday = d === todayStr;
                        return (
                          <th
                            key={d}
                            className={`px-0.5 py-1 text-[10px] font-semibold ${
                              isToday ? "text-emerald-700" : "admin-soft"
                            }`}
                            title={d}
                          >
                            {dayNum}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((row) => (
                      <tr key={row.timeOfDay}>
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-[var(--admin-panel)] px-2 py-1 text-left">
                          <span className="font-mono text-xs font-bold admin-text">
                            {row.timeOfDay}
                          </span>
                          {row.label && (
                            <span className="ml-1 text-[10px] admin-soft">{row.label}</span>
                          )}
                        </td>
                        {row.cells.map((c) => (
                          <td key={`${row.timeOfDay}-${c.date}`} className="p-0.5">
                            <div
                              className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg text-[9px] font-bold ${cellColor(c.status)}`}
                              title={`${c.date} ${row.timeOfDay}: ${c.status}`}
                            >
                              {cellGlyph(c.status)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--admin-inset-2)] pt-3 text-[11px] admin-soft">
                  <LegendDot className="bg-emerald-500" label="Taken" />
                  <LegendDot className="bg-amber-500" label="Late" />
                  <LegendDot className="bg-rose-500" label="Missed" />
                  <LegendDot className="bg-slate-400" label="Skipped" />
                  <LegendDot className="bg-blue-400" label="Pending" />
                  <LegendDot className="bg-[var(--admin-inset)] border border-black/10" label="None" />
                </div>
              </div>
            )}
          </AdminPanel>

          {/* Dose audit trail */}
          <AdminPanel
            title="Recent dose log"
            description={`${prescription.doseLogs.length || prescription.adherence.length} entries`}
          >
            {prescription.doseLogs.length === 0 && prescription.adherence.length === 0 ? (
              <AdminEmptyState
                icon={TrendingUp}
                title="No dose logs yet"
                description="Entries appear when the patient confirms doses or the system auto-marks missed."
              />
            ) : (
              <ul className="space-y-2">
                {(prescription.doseLogs.length > 0
                  ? prescription.doseLogs
                  : prescription.adherence
                )
                  .slice(0, 20)
                  .map((a: DoseLogRow | { id: string; status: string; takenOn: Date; notes: string | null }) => {
                    const status = a.status;
                    const time =
                      "scheduledTime" in a && a.scheduledTime ? `@ ${a.scheduledTime}` : "";
                    const date =
                      "scheduledDate" in a
                        ? formatDate(a.scheduledDate)
                        : formatDate((a as { takenOn: Date }).takenOn);
                    const recordedBy =
                      "recordedBy" in a && a.recordedBy ? ` · ${a.recordedBy}` : "";
                    return (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] px-4 py-2.5 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold ${
                              status === "taken"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "late"
                                ? "bg-amber-100 text-amber-700"
                                : status === "missed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {status === "taken" && <Check className="h-4 w-4" />}
                            {status === "late" && <Clock className="h-4 w-4" />}
                            {status === "missed" && <AlertTriangle className="h-4 w-4" />}
                            {status !== "taken" &&
                              status !== "late" &&
                              status !== "missed" && <Minus className="h-4 w-4" />}
                          </span>
                          <div>
                            <p className="font-bold capitalize admin-text">
                              {status} {time}
                            </p>
                            <p className="text-[10px] admin-soft">
                              {date}
                              {recordedBy}
                            </p>
                          </div>
                        </div>
                        {"notes" in a && a.notes && (
                          <span className="max-w-full truncate rounded-lg bg-white/60 px-2.5 py-1 text-[11px] italic admin-muted dark:bg-black/40">
                            &ldquo;{a.notes}&rdquo;
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </AdminPanel>

          {/* Refills */}
          <AdminPanel
            title="Refill history"
            description={`${prescription.refillRequests.length} requests`}
          >
            {prescription.refillRequests.length === 0 ? (
              <p className="py-4 text-center text-xs admin-soft">No refill requests yet.</p>
            ) : (
              <ul className="space-y-2">
                {prescription.refillRequests.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] px-4 py-2.5 text-xs"
                  >
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

        {/* Sidebar — secondary specs */}
        <div className="space-y-5 lg:col-span-1 lg:space-y-6">
          <AdminPanel title="Regimen" description="Dosage & schedule">
            <div className="rounded-xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider admin-soft">Medicine</p>
              <p className="mt-1 text-sm font-bold admin-text">{prescription.medicineName}</p>
              <p className="mt-1 text-xs font-semibold text-[#0d6e5a] dark:text-emerald-400">
                {formula.formulaLabel}
              </p>
              {prescription.dosage && (
                <p className="mt-1 text-[11px] admin-muted">{prescription.dosage}</p>
              )}
              {prescription.schedule && (
                <p className="mt-0.5 text-[11px] admin-muted">{prescription.schedule}</p>
              )}
            </div>

            {prescription.doseSchedule.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider admin-soft">
                  Daily slots
                </p>
                {prescription.doseSchedule.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] px-3 py-2 text-xs"
                  >
                    <span className="font-mono font-bold text-[#0d6e5a] dark:text-emerald-400">
                      {slot.timeOfDay}
                    </span>
                    <span className="admin-soft">{slot.label || "Daily"}</span>
                  </div>
                ))}
              </div>
            )}
          </AdminPanel>

          <AdminPanel title="Rx details" description="Administrative metadata">
            <dl className="space-y-2.5 text-xs">
              <MetaRow label="Status">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLOR[prescription.status]}`}
                >
                  {prescription.status.replace("_", " ")}
                </span>
              </MetaRow>
              <MetaRow label="Rx reference">
                <span className="font-mono font-bold admin-text">
                  {prescription.rxReference || "—"}
                </span>
              </MetaRow>
              <MetaRow label="Prescriber">
                <span className="font-semibold admin-text">
                  {prescription.prescriber || "Staff pharmacist"}
                </span>
              </MetaRow>
              <MetaRow label="Unit price">
                <span className="font-bold admin-text">
                  {prescription.unitPrice
                    ? `KES ${Number(prescription.unitPrice).toLocaleString()}`
                    : "Not set"}
                </span>
              </MetaRow>
              <MetaRow label="Course start">
                <span className="font-semibold admin-text">
                  {formatDate(prescription.startDate || prescription.createdAt)}
                </span>
              </MetaRow>
              {prescription.endDate && (
                <MetaRow label="Course end">
                  <span className="font-semibold admin-text">
                    {formatDate(prescription.endDate)}
                  </span>
                </MetaRow>
              )}
              {prescription.nextRefillDue && (
                <MetaRow label="Next refill">
                  <span className="font-bold text-[#0d6e5a] dark:text-emerald-400">
                    {formatDate(prescription.nextRefillDue)}
                  </span>
                </MetaRow>
              )}
            </dl>

            {prescription.notes && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Pharmacist notes
                </p>
                <p className="mt-1 text-xs text-amber-900">{prescription.notes}</p>
              </div>
            )}

            {prescription.customer && (
              <Link
                href={`/admin/customers/${prescription.customer.id}`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold admin-accent-text hover:underline"
              >
                Open full customer profile <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  bar,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "good" | "warn" | "bad" | "info";
  bar?: number;
}) {
  const iconBg =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-700"
      : tone === "warn"
      ? "bg-amber-500/15 text-amber-700"
      : tone === "bad"
      ? "bg-rose-500/15 text-rose-700"
      : "bg-blue-500/15 text-blue-700";
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "bad"
      ? "text-rose-700"
      : "admin-text";

  return (
    <div className="rounded-2xl border border-[var(--admin-inset-2)] bg-gradient-to-br from-[var(--admin-inset)] to-white p-4 shadow-xs dark:to-slate-900 sm:rounded-3xl sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl sm:h-9 sm:w-9 sm:rounded-2xl ${iconBg}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-2xl font-extrabold sm:mt-3 sm:text-3xl ${valueColor}`}>{value}</p>
      {typeof bar === "number" && (
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${
              bar > 30
                ? "bg-gradient-to-r from-emerald-500 to-[#0d6e5a]"
                : bar > 15
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-gradient-to-r from-rose-500 to-rose-600"
            }`}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      )}
      <p className="mt-1 text-[11px] admin-soft">{hint}</p>
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[var(--admin-inset-2)] py-1.5">
      <span className="font-medium admin-soft">{label}</span>
      {children}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function cellColor(status: string): string {
  switch (status) {
    case "taken":
      return "bg-emerald-500 text-white";
    case "late":
      return "bg-amber-500 text-white";
    case "missed":
      return "bg-rose-500 text-white";
    case "skipped":
      return "bg-slate-400 text-white";
    case "unknown":
      return "bg-rose-200 text-rose-800";
    case "pending":
      return "bg-blue-100 text-blue-700";
    case "future":
      return "bg-[var(--admin-inset)] admin-soft";
    default:
      return "bg-[var(--admin-inset)] admin-soft border border-black/5";
  }
}

function cellSurface(status: string): string {
  switch (status) {
    case "taken":
    case "late":
      return "border-emerald-500/30 bg-emerald-500/10";
    case "missed":
    case "unknown":
      return "border-rose-500/30 bg-rose-500/10";
    case "skipped":
      return "border-slate-400/30 bg-slate-400/10";
    case "pending":
      return "border-blue-500/20 bg-blue-500/10";
    default:
      return "border-[var(--admin-inset-2)] bg-[var(--admin-inset)]";
  }
}

function cellGlyph(status: string): React.ReactNode {
  switch (status) {
    case "taken":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "late":
      return <Clock className="h-3.5 w-3.5" />;
    case "missed":
    case "unknown":
      return <XCircle className="h-3.5 w-3.5" />;
    case "skipped":
      return "S";
    case "pending":
      return "·";
    case "future":
      return "";
    default:
      return "—";
  }
}

function CellBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    taken: "bg-emerald-100 text-emerald-800",
    late: "bg-amber-100 text-amber-800",
    missed: "bg-rose-100 text-rose-800",
    unknown: "bg-rose-100 text-rose-800",
    skipped: "bg-slate-100 text-slate-700",
    pending: "bg-blue-100 text-blue-800",
  };
  const label =
    status === "unknown" ? "Unconfirmed" : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status] || "bg-slate-100 text-slate-600"}`}
    >
      {label}
    </span>
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
            "You are a clinical pharmacy assistant. Write a concise markdown adherence analysis for a pharmacist. Lead with the single most important clinical takeaway. Then: summary, dosage/schedule trends, observation, tiered recommendations, refill notes. No preamble. Do not invent diagnoses.",
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
  formulaLabel?: string;
  slots?: string;
}): string {
  const {
    medicineName,
    adherenceRate,
    missedCount,
    skippedCount,
    lateCount = 0,
    logCount,
    nextRefillDue,
    refillsRemaining,
    dosage,
    schedule,
    unitsRemaining,
    daysRemaining,
    formulaLabel,
    slots,
  } = input;

  if (logCount === 0) {
    return `### Priority takeaway\n\nNo dose logs yet for **${medicineName}**. Encourage portal confirmation so adherence and refill forecasts become reliable.`;
  }

  const lines: string[] = [];

  if (adherenceRate !== null && adherenceRate < 70) {
    lines.push(
      `### Priority takeaway\n\n**Low adherence (${adherenceRate}%)** on **${medicineName}** — ${missedCount} missed dose(s). Contact the patient or caregiver before the next refill cycle.`
    );
  } else if (adherenceRate !== null && adherenceRate < 85) {
    lines.push(
      `### Priority takeaway\n\n**Moderate adherence (${adherenceRate}%)** — a few gaps detected. A short check-in on barriers (timing, side effects) is warranted.`
    );
  } else {
    lines.push(
      `### Priority takeaway\n\n**Strong adherence (${adherenceRate}%)** on **${medicineName}**. Maintain current regimen and automated reminders.`
    );
  }

  lines.push("");
  lines.push(`### Summary`);
  lines.push(
    `Across **${logCount} expected slots**: ${logCount - missedCount - skippedCount} taken/late, **${missedCount} missed**, ${skippedCount} skipped${lateCount ? `, ${lateCount} late` : ""}.`
  );

  if (formulaLabel || dosage || schedule || slots) {
    lines.push("");
    lines.push(`### Regimen`);
    if (formulaLabel) lines.push(`- Formula: **${formulaLabel}**`);
    if (dosage || schedule) lines.push(`- Directions: ${[dosage, schedule].filter(Boolean).join(" · ")}`);
    if (slots) lines.push(`- Daily times: **${slots}**`);
  }

  if (unitsRemaining !== undefined && daysRemaining !== undefined) {
    lines.push("");
    lines.push(
      `### Supply\n\n~**${unitsRemaining} units** remaining (≈ **${daysRemaining} days**). **${refillsRemaining}** refill(s) left.`
    );
  }

  lines.push("");
  lines.push(`### Recommendations`);
  if (adherenceRate !== null && adherenceRate >= 85) {
    lines.push(`- Keep current schedule and dose reminders.`);
    lines.push(`- Confirm next refill date is visible in the portal.`);
  } else if (adherenceRate !== null && adherenceRate >= 70) {
    lines.push(`- Call/message to identify barriers (forgetfulness, side effects, timing).`);
    lines.push(`- Verify push dose reminders are enabled.`);
  } else {
    lines.push(`- **Urgent follow-up** with patient or assigned caregiver.`);
    lines.push(`- Consider adjusting dose times if the current slots are inconvenient.`);
  }

  if (nextRefillDue) {
    const days = Math.ceil((nextRefillDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    lines.push("");
    lines.push(`### Refill`);
    if (days <= 3 && days >= 0) {
      lines.push(
        `Due in **${days} day${days === 1 ? "" : "s"}** · **${refillsRemaining}** remaining.`
      );
    } else if (days < 0) {
      lines.push(
        `**Overdue by ${Math.abs(days)} day${days === -1 ? "" : "s"}** · **${refillsRemaining}** remaining.`
      );
    } else {
      lines.push(`Next due ${formatDate(nextRefillDue)} · **${refillsRemaining}** remaining.`);
    }
  }

  return lines.join("\n");
}
