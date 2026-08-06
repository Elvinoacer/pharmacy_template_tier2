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
import { formatDate, formatTime } from "@/app/lib/time";
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

  await processAutoMissedDoses(user.customerId).catch(() => 0);

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

  const totalExpectedDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.expectedDosesToDate, 0);
  const totalTakenDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.takenDosesCount, 0);
  const totalMissedDoses = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.missedDosesCount, 0);
  const totalRemainingUnits = calculatedPrescriptions.reduce((acc, c) => acc + c.metrics.unitsRemaining, 0);

  const overallAdherence = totalExpectedDoses > 0
    ? Math.min(100, Math.round((totalTakenDoses / totalExpectedDoses) * 100))
    : 100;

  const nowTime = formatTime(new Date());

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
      title="Prescriptions"
      subtitle="Dose schedule, adherence, and refill supply."
      actions={
        <Link
          href="/portal/refills/new"
          className="btn-primary inline-flex w-full items-center justify-center gap-1.5 sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Request refill
        </Link>
      }
    >
      <DoseReminderBanner pendingDoses={pendingDoseItems} />

      {/* Stats — 2×2 on phones, 4-col on large */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Adherence"
          value={`${overallAdherence}%`}
          hint={`${totalTakenDoses}/${totalExpectedDoses} doses`}
          icon={<TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />}
          tone={overallAdherence >= 85 ? "good" : overallAdherence >= 70 ? "warn" : "bad"}
        />
        <StatCard
          label="Active"
          value={String(active.length)}
          hint={`${todaysDoses.length} slot${todaysDoses.length === 1 ? "" : "s"} today`}
          icon={<Pill className="h-4 w-4 sm:h-5 sm:w-5" />}
          tone="neutral"
        />
        <StatCard
          label="Supply left"
          value={String(totalRemainingUnits)}
          hint="units remaining"
          icon={<PackageCheck className="h-4 w-4 sm:h-5 sm:w-5" />}
          tone="info"
        />
        <StatCard
          label="Missed"
          value={String(totalMissedDoses)}
          hint="auto-marked past due"
          icon={<ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5" />}
          tone="bad"
        />
      </div>

      {/* Today's doses */}
      <Panel
        title="Today's doses"
        description="Confirm each slot when taken"
        className="mb-6 sm:mb-8"
      >
        {todaysDoses.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No scheduled doses for today"
            description="Active medications will show time slots here."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {todaysDoses.map((dose) => {
              const isPast = dose.timeOfDay < nowTime;
              const status = dose.doseLog?.status || (isPast ? "missed" : "pending");

              return (
                <div
                  key={dose.scheduleId}
                  className={`flex flex-col rounded-2xl border p-3.5 sm:p-4 ${
                    status === "taken" || status === "late"
                      ? "border-emerald-200 bg-emerald-50/50"
                      : status === "missed"
                      ? "border-rose-200 bg-rose-50/50"
                      : isPast
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-[#e3ebe6] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#0d6e5a]">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {dose.timeOfDay}
                        {dose.label ? ` · ${dose.label}` : ""}
                      </span>
                      <h4 className="mt-1 truncate font-bold text-[#0c1a14]">{dose.medicineName}</h4>
                      {dose.dosage && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#5a6b62]">{dose.dosage}</p>
                      )}
                    </div>
                    <StatusPill status={status} />
                  </div>

                  <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                    <span className="block text-[11px] text-[#8a9a92]">
                      {dose.doseLog?.recordedBy
                        ? `Logged by ${dose.doseLog.recordedBy}`
                        : isPast
                          ? "Overdue — confirm now"
                          : "Upcoming — confirm when taken"}
                    </span>
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

      {/* Active prescriptions */}
      <Panel
        title="Active prescriptions"
        description={`${active.length} active · supply & refill forecast`}
        className="mb-6 sm:mb-8"
      >
        {active.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No active prescriptions"
            description="Issued prescriptions appear here with calculated supply."
          />
        ) : (
          <ul className="space-y-4 sm:space-y-6">
            {calculatedPrescriptions.map(({ prescription: p, metrics, formula }) => {
              const percentRemaining = Math.min(
                100,
                Math.max(0, Math.round((metrics.unitsRemaining / metrics.totalQuantity) * 100))
              );

              return (
                <li
                  key={p.id}
                  className="rounded-2xl border border-[#e3ebe6] bg-white p-4 shadow-sm sm:rounded-3xl sm:p-6"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e6f4ef] to-[#0d6e5a]/10 text-[#0d6e5a] sm:h-12 sm:w-12 sm:rounded-2xl">
                        <Pill className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-[#0c1a14] sm:text-lg">
                            {p.medicineName}
                          </h3>
                          <Badge className={STATUS_COLOR[p.status] || "bg-slate-100 text-slate-700"}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-[#0d6e5a]">
                          {formula.formulaLabel}
                        </p>
                        {p.schedule && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#8a9a92]">{p.schedule}</p>
                        )}
                        {p.doseSchedule.length > 0 && (
                          <p className="mt-1.5 flex flex-wrap gap-1">
                            {p.doseSchedule.map((s) => (
                              <span
                                key={s.id}
                                className="rounded-md bg-[#e6f4ef] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0d6e5a]"
                              >
                                {s.timeOfDay}
                                {s.label ? ` ${s.label}` : ""}
                              </span>
                            ))}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          metrics.adherenceRate >= 85
                            ? "bg-emerald-100 text-emerald-800"
                            : metrics.adherenceRate >= 70
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {metrics.adherenceRate}% adherence
                      </span>
                      <p className="mt-1 text-[11px] text-[#8a9a92]">
                        {metrics.takenDosesCount} taken · {metrics.missedDosesCount} missed
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-[#e3ebe6] bg-[#f8faf8] p-3 sm:rounded-2xl sm:p-4">
                    <div className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-bold text-[#0c1a14]">
                        {metrics.unitsRemaining} / {metrics.totalQuantity} units left
                      </span>
                      <span className="font-semibold text-[#0d6e5a]">
                        ~{metrics.daysRemaining} days supply
                      </span>
                    </div>
                    <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 sm:h-3.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentRemaining > 30
                            ? "bg-gradient-to-r from-emerald-500 to-[#0d6e5a]"
                            : percentRemaining > 15
                            ? "bg-gradient-to-r from-amber-400 to-amber-500"
                            : "animate-pulse bg-gradient-to-r from-rose-500 to-rose-600"
                        }`}
                        style={{ width: `${percentRemaining}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#5a6b62]">
                      <span>Started {formatDate(metrics.startDate)}</span>
                      {metrics.projectedRunOutDate && (
                        <span>Run-out {formatDate(metrics.projectedRunOutDate)}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    {p.rxReference && (
                      <div className="flex min-w-0 items-center gap-1.5 text-[#5a6b62]">
                        <Hash className="h-3.5 w-3.5 shrink-0 text-[#8a9a92]" />
                        <span className="truncate font-mono">{p.rxReference}</span>
                      </div>
                    )}
                    {p.prescriber && (
                      <div className="flex min-w-0 items-center gap-1.5 text-[#5a6b62]">
                        <User className="h-3.5 w-3.5 shrink-0 text-[#8a9a92]" />
                        <span className="truncate">{p.prescriber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[#5a6b62]">
                      <Activity className="h-3.5 w-3.5 shrink-0 text-[#8a9a92]" />
                      <span>{p.refillsRemaining ?? 0} refills left</span>
                    </div>
                    {p.nextRefillDue && (
                      <div className="flex items-center gap-1.5 text-[#0d6e5a]">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span>Due {formatDate(p.nextRefillDue)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-[#e3ebe6] pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-4">
                    <p className="text-[11px] leading-relaxed text-[#8a9a92]">
                      Log doses from <strong>Today&apos;s doses</strong> above or push notifications.
                    </p>
                    <Link
                      href={`/portal/refills/new?prescriptionId=${p.id}&medicine=${encodeURIComponent(p.medicineName)}&rx=${encodeURIComponent(p.rxReference || "")}`}
                      className={`inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold shadow-xs transition sm:w-auto ${
                        (p.refillsRemaining ?? 0) > 0
                          ? "bg-gradient-to-r from-[#0d6e5a] to-[#084c3f] text-white hover:brightness-110"
                          : "cursor-not-allowed bg-slate-200 text-slate-500"
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      {(p.refillsRemaining ?? 0) > 0 ? "Request refill" : "No refills left"}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {otcCourseItems.length > 0 && (
        <Panel
          title="Over-the-counter"
          description="Recent non-prescription purchases"
          className="mb-6 sm:mb-8"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {otcCourseItems.map((item, idx) => (
              <div
                key={`${item.orderId}-${idx}`}
                className="rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] p-3.5 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <ShoppingBag className="h-4 w-4 shrink-0 text-[#0d6e5a]" />
                    <span className="truncate text-sm font-bold text-[#0c1a14]">{item.name}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-800">
                    {item.source}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#5a6b62]">
                  Qty {item.quantity} · {formatDate(item.purchasedAt)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {others.length > 0 && (
        <Panel title="Past prescriptions" description="On hold, expired, or discontinued">
          <ul className="space-y-2">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#e3ebe6] bg-[#fafbfa] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#0c1a14]">{p.medicineName}</p>
                  <p className="text-xs text-[#5a6b62]">
                    {p.rxReference || "No Rx ref"} · {p.prescriber || "Staff pharmacist"}
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

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  tone: "good" | "warn" | "bad" | "neutral" | "info";
}) {
  const iconBg =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warn"
      ? "bg-amber-100 text-amber-700"
      : tone === "bad"
      ? "bg-rose-100 text-rose-700"
      : tone === "info"
      ? "bg-blue-100 text-blue-700"
      : "bg-[#0d6e5a]/10 text-[#0d6e5a]";
  const valueColor =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
      ? "text-amber-700"
      : tone === "bad"
      ? "text-rose-700"
      : "text-[#0c1a14]";

  return (
    <div className="rounded-xl border border-white/60 bg-gradient-to-br from-white to-[#f4f7f4] p-3 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5a6b62] sm:text-xs">
          {label}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${iconBg}`}>
          {icon}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-1 sm:mt-3 sm:gap-2">
        <span className={`text-xl font-extrabold sm:text-3xl ${valueColor}`}>{value}</span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-[10px] text-[#5a6b62] sm:mt-1 sm:text-[11px]">{hint}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "taken") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 sm:text-[11px]">
        <CheckCircle2 className="h-3 w-3 text-emerald-600 sm:h-3.5 sm:w-3.5" /> Taken
      </span>
    );
  }
  if (status === "late") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 sm:text-[11px]">
        <Clock className="h-3 w-3 text-amber-600 sm:h-3.5 sm:w-3.5" /> Late
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800 sm:text-[11px]">
        <AlertCircle className="h-3 w-3 text-rose-600 sm:h-3.5 sm:w-3.5" /> Missed
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700 sm:text-[11px]">
        Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-800 sm:text-[11px]">
      Upcoming
    </span>
  );
}
