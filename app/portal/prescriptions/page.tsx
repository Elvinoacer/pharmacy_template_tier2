import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/app/lib/require-onboarded";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { PortalShell } from "@/app/components/portal/PortalShell";
import { Panel, Badge, EmptyState } from "@/app/components/portal/PortalWidgets";
import { AdherenceTracker } from "@/app/components/portal/AdherenceTracker";
import { DoseReminderBanner, type PendingDoseItem } from "@/app/components/portal/DoseReminderBanner";
import {
  parseDosageFormula,
  calculatePrescriptionMetrics,
  getTodaysDosesForCustomer,
  processAutoMissedDoses,
} from "@/app/lib/services/medication-schedule";
import { formatDate } from "@/app/lib/time";
import {
  FileText,
  Plus,
  CalendarClock,
  User,
  Hash,
  Pill,
  Activity,
  TrendingUp,
  AlertCircle,
  PackageCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
} from "lucide-react";

export const metadata = { title: "Prescriptions & Dosage Management" };

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  on_hold: "bg-amber-100 text-amber-800 border border-amber-200",
  expired: "bg-slate-100 text-slate-700 border border-slate-200",
  discontinued: "bg-rose-100 text-rose-800 border border-rose-200",
};

export default async function PortalPrescriptionsPage() {
  const user = await getSessionUser();
  if (!user?.customerId) redirect("/login");
  await requireOnboarded();

  // Run auto-missed processor to update past due slots strictly
  await processAutoMissedDoses(user.customerId).catch(() => 0);

  // Fetch prescriptions, dose logs, today's schedule, and OTC orders with dosage
  const [prescriptions, todaysDoses, otcOrders] = await Promise.all([
    prisma.prescription.findMany({
      where: { customerId: user.customerId },
      orderBy: { nextRefillDue: "asc" },
      include: {
        doseLogs: {
          orderBy: { scheduledDate: "desc" },
          take: 60,
        },
        doseSchedule: {
          where: { active: true },
          orderBy: { timeOfDay: "asc" },
        },
      },
    }),
    getTodaysDosesForCustomer(user.customerId),
    prisma.order.findMany({
      where: { customerId: user.customerId, status: { in: ["paid", "fulfilled"] } },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const active = prescriptions.filter((p) => p.status === "active");
  const others = prescriptions.filter((p) => p.status !== "active");

  // Calculate metrics for each active prescription
  const calculatedPrescriptions = active.map((p) => {
    const metrics = calculatePrescriptionMetrics(
      {
        startDate: p.startDate,
        createdAt: p.createdAt,
        dosage: p.dosage,
        schedule: p.schedule,
        quantity: p.quantity,
      },
      p.doseLogs,
      p.doseSchedule.map((s) => ({ timeOfDay: s.timeOfDay, label: s.label || undefined }))
    );

    return {
      prescription: p,
      metrics,
      formula: parseDosageFormula(p.dosage, p.schedule),
    };
  });

  // Calculate overall summary metrics
  const totalExpectedDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.expectedDosesToDate, 0);
  const totalTakenDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.takenDosesCount, 0);
  const totalMissedDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.missedDosesCount, 0);
  const totalRemainingUnits = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.unitsRemaining, 0);
  
  const overallAdherence = totalExpectedDoses > 0
    ? Math.min(100, Math.round((totalTakenDoses / totalExpectedDoses) * 100))
    : 100;

  // Find pending / overdue doses for today to pass to DoseReminderBanner
  const nowTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  
  const pendingDoseItems: PendingDoseItem[] = todaysDoses
    .filter((d) => (!d.doseLog || d.doseLog.status === "unknown") && d.timeOfDay <= nowTime)
    .map((d) => ({
      scheduleId: d.scheduleId,
      prescriptionId: d.prescriptionId,
      medicineName: d.medicineName,
      dosage: d.dosage,
      timeOfDay: d.timeOfDay,
      label: d.label,
      status: "overdue",
    }));

  // Extract OTC items that have dosage or medication info
  const otcCourseItems = otcOrders.flatMap((o) =>
    o.items.map((item) => ({
      orderId: o.id,
      name: item.name,
      quantity: item.quantity,
      purchasedAt: o.createdAt,
      source: o.source,
      formula: parseDosageFormula(item.name, null),
    }))
  );

  return (
    <PortalShell
      user={user}
      title="Prescriptions & Calculated Dosage"
      subtitle="Automated dose calculations, strict adherence tracking, and 1-tap reminders."
      actions={
        <Link href="/portal/refills/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Request refill
        </Link>
      }
    >
      {/* Pending Dose Reminder Banner */}
      <DoseReminderBanner pendingDoses={pendingDoseItems} />

      {/* Hero Calculated Dashboard Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Adherence Rate Box */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white to-[#f4f7f4] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
              Strict Adherence Rate
            </span>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              overallAdherence >= 85 ? "bg-emerald-100 text-emerald-700" : overallAdherence >= 70 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
            }`}>
              <TrendingUp className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${
              overallAdherence >= 85 ? "text-emerald-700" : overallAdherence >= 70 ? "text-amber-700" : "text-rose-700"
            }`}>
              {overallAdherence}%
            </span>
            <span className="text-xs text-[#8a9a92]">
              ({totalTakenDoses}/{totalExpectedDoses} doses)
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#5a6b62]">
            Calculated automatically from scheduled slots. Unconfirmed doses mark as missed.
          </p>
        </div>

        {/* Total Active Courses Box */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white to-[#e6f4ef]/40 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
              Active Courses
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d6e5a]/10 text-[#0d6e5a]">
              <Pill className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0c1a14]">{active.length}</span>
            <span className="text-xs font-medium text-[#0d6e5a]">Prescriptions</span>
          </div>
          <p className="mt-1 text-[11px] text-[#5a6b62]">
            {todaysDoses.length} dose slot{todaysDoses.length === 1 ? "" : "s"} scheduled for today
          </p>
        </div>

        {/* Pill Inventory Gauge */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white to-[#f4f7f4] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
              Calculated Inventory
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <PackageCheck className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#0c1a14]">{totalRemainingUnits}</span>
            <span className="text-xs text-[#8a9a92]">units remaining</span>
          </div>
          <p className="mt-1 text-[11px] text-[#5a6b62]">
            Calculated stock based on dosage consumption
          </p>
        </div>

        {/* Missed Doses Alert Box */}
        <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white to-rose-50/50 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Auto-Marked Missed
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-700">{totalMissedDoses}</span>
            <span className="text-xs text-rose-600">missed doses</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-700">
            Unconfirmed doses past deadline auto-convert to missed
          </p>
        </div>
      </div>

      {/* Today's Operational Schedule Board */}
      <Panel
        title="Today's Dose Operations"
        description="Real-time daily schedule with 1-tap confirmation"
        className="mb-8"
      >
        {todaysDoses.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No scheduled doses for today"
            description="Your active medications will automatically populate time slots here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todaysDoses.map((dose) => {
              const isPast = dose.timeOfDay < nowTime;
              const status = dose.doseLog?.status || (isPast ? "missed" : "pending");

              return (
                <div
                  key={dose.scheduleId}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition ${
                    status === "taken" || status === "late"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : status === "missed"
                      ? "border-rose-200 bg-rose-50/50"
                      : isPast
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-[#e3ebe6] bg-white hover:border-[#0d6e5a]/30 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#0d6e5a]">
                        <Clock className="h-3.5 w-3.5" /> {dose.timeOfDay} {dose.label ? `· ${dose.label}` : ""}
                      </span>
                      <h4 className="mt-1 font-bold text-[#0c1a14]">{dose.medicineName}</h4>
                      {dose.dosage && <p className="text-xs text-[#5a6b62]">{dose.dosage}</p>}
                    </div>

                    <div>
                      {status === "taken" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Taken
                        </span>
                      )}
                      {status === "late" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                          <Clock className="h-3.5 w-3.5 text-amber-600" /> Late
                        </span>
                      )}
                      {status === "missed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" /> Missed
                        </span>
                      )}
                      {status === "pending" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[11px] font-bold text-blue-800">
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-black/5 pt-3">
                    <span className="text-[11px] text-[#8a9a92]">
                      {dose.doseLog?.recordedBy
                        ? `Logged by ${dose.doseLog.recordedBy}`
                        : isPast
                          ? "Overdue — confirm in the banner above or below"
                          : "Upcoming — confirm when taken"}
                    </span>
                    {/* Only offer slot actions when not already logged.
                        Overdue items are also in DoseReminderBanner; board keeps
                        a full-width stacked group so mobile stays usable. */}
                    {(!dose.doseLog || dose.doseLog.status === "unknown") && (
                      <AdherenceTracker
                        prescriptionId={dose.prescriptionId}
                        scheduledTime={dose.timeOfDay}
                        scheduleId={dose.scheduleId}
                        initialStatus={
                          dose.doseLog?.status === "unknown"
                            ? null
                            : (dose.doseLog?.status as
                                | "taken"
                                | "missed"
                                | "skipped"
                                | "late"
                                | null
                                | undefined)
                        }
                        stacked
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Active Calculated Prescriptions */}
      <Panel
        title="Active Prescriptions & Calculated Supply"
        description={`${active.length} active prescriptions · calculated remaining doses & refill forecast`}
        className="mb-8"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No active prescriptions on file"
            description="When your prescription is issued by Aether Pharmacy, it will appear here with calculated formulas."
          />
        ) : (
          <ul className="space-y-6">
            {calculatedPrescriptions.map(({ prescription: p, metrics, formula }) => {
              const percentRemaining = Math.min(
                100,
                Math.max(0, Math.round((metrics.unitsRemaining / metrics.totalQuantity) * 100))
              );

              return (
                <li
                  key={p.id}
                  className="rounded-3xl border border-[#e3ebe6] bg-white p-6 shadow-sm transition hover:border-[#0d6e5a]/30 hover:shadow-md"
                >
                  {/* Top Bar: Title, Formula & Status */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e6f4ef] to-[#0d6e5a]/10 text-[#0d6e5a] shadow-xs">
                        <Pill className="h-6 w-6" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-[#0c1a14]">{p.medicineName}</h3>
                          <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-700"}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[#0d6e5a]">
                          Dosage Formula: <span className="font-semibold">{formula.formulaLabel}</span>
                        </p>
                        {p.schedule && <p className="text-xs text-[#8a9a92]">{p.schedule}</p>}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                        metrics.adherenceRate >= 85
                          ? "bg-emerald-100 text-emerald-800"
                          : metrics.adherenceRate >= 70
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}>
                        Adherence Score: {metrics.adherenceRate}%
                      </span>
                      <p className="mt-1 text-[11px] text-[#8a9a92]">
                        {metrics.takenDosesCount} taken · {metrics.missedDosesCount} missed of {metrics.expectedDosesToDate} expected
                      </p>
                    </div>
                  </div>

                  {/* Calculated Pill Supply Progress Gauge */}
                  <div className="mt-5 rounded-2xl bg-[#f8faf8] p-4 border border-[#e3ebe6]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#0c1a14]">
                        Calculated Supply Remaining: {metrics.unitsRemaining} / {metrics.totalQuantity} units
                      </span>
                      <span className="font-semibold text-[#0d6e5a]">
                        ~ {metrics.daysRemaining} days supply left
                      </span>
                    </div>

                    <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentRemaining > 30
                            ? "bg-gradient-to-r from-emerald-500 to-[#0d6e5a]"
                            : percentRemaining > 15
                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                            : "bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse"
                        }`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between text-[11px] text-[#5a6b62]">
                      <span>Started: {formatDate(metrics.startDate)}</span>
                      {metrics.projectedRunOutDate && (
                        <span>Est. Run-Out: {formatDate(metrics.projectedRunOutDate)}</span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {p.rxReference && (
                      <div className="flex items-center gap-1.5 text-[#5a6b62]">
                        <Hash className="h-3.5 w-3.5 text-[#8a9a92]" />
                        <span className="truncate font-mono">{p.rxReference}</span>
                      </div>
                    )}
                    {p.prescriber && (
                      <div className="flex items-center gap-1.5 text-[#5a6b62]">
                        <User className="h-3.5 w-3.5 text-[#8a9a92]" />
                        <span className="truncate">{p.prescriber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[#5a6b62]">
                      <Activity className="h-3.5 w-3.5 text-[#8a9a92]" />
                      <span>{p.refillsRemaining ?? 0} refills left</span>
                    </div>
                    {p.nextRefillDue && (
                      <div className="flex items-center gap-1.5 text-[#0d6e5a]">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>Refill Due: {formatDate(p.nextRefillDue)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action bar — history/refill only. Dose confirm lives on
                      Today's Dose Operations + DoseReminderBanner above. */}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e3ebe6] pt-4">
                    <p className="text-[11px] text-[#8a9a92]">
                      Log individual doses from <strong>Today&apos;s Dose Operations</strong> or
                      push notifications — not here.
                    </p>
                    <Link
                      href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-xs transition ${
                        (p.refillsRemaining ?? 0) > 0
                          ? "bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] text-white hover:brightness-110"
                          : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {(p.refillsRemaining ?? 0) > 0 ? "Request Refill" : "No Refills Left"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {/* OTC Orders & Non-Prescription Dosage Section */}
      {otcCourseItems.length > 0 && (
        <Panel
          title="Over-The-Counter & Non-Prescription Dosage"
          description="Medication orders with calculated automated reminders"
          className="mb-8"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {otcCourseItems.map((item, idx) => (
              <div
                key={`${item.orderId}-${idx}`}
                className="rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] p-4 transition hover:bg-white hover:shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#0d6e5a]" />
                    <span className="font-bold text-sm text-[#0c1a14]">{item.name}</span>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800 capitalize">
                    {item.source} Order
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  Quantity: {item.quantity} · Purchased: {formatDate(item.purchasedAt)}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-[#0d6e5a]">
                  <span>Formula: {item.formula.formulaLabel}</span>
                  <span className="font-semibold">Automated Reminders Active</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Inactive / Past Prescriptions */}
      {others.length > 0 && (
        <Panel title="Past & Archived Prescriptions" description="On hold, expired, or discontinued">
          <ul className="space-y-2">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] px-4 py-3"
              >
                <div>
                  <p className="font-bold text-sm text-[#0c1a14]">{p.medicineName}</p>
                  <p className="text-xs text-[#5a6b62]">
                    {p.rxReference || "No Rx ref"} · Prescribed by {p.prescriber || "Staff Pharmacist"}
                  </p>
                </div>
                <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-700"}>
                  {p.status.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PortalShell>
  );
}
