import "server-only";

import { prisma } from "@/app/lib/db";
import {
  getAdherenceStatsForCustomer,
  getAdherencePerPrescription,
} from "@/app/lib/services/adherence";
import { parseDosageFormula, calculatePrescriptionMetrics } from "@/app/lib/services/medication-schedule";
import { formatDate } from "@/app/lib/time";
import { Activity, TrendingUp, Calendar, Award, AlertTriangle, Pill, ShieldAlert } from "lucide-react";

export async function AdminAdherencePanel({ customerId }: { customerId: string }) {
  const [stats, perRx, recentDoses, activePrescriptions] = await Promise.all([
    getAdherenceStatsForCustomer(customerId, 14),
    getAdherencePerPrescription(customerId, 14),
    prisma.doseLog.findMany({
      where: { customerId },
      include: { prescription: { select: { medicineName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.prescription.findMany({
      where: { customerId, status: "active" },
      include: {
        doseLogs: { orderBy: { scheduledDate: "desc" }, take: 30 },
      },
    }),
  ]);

  const lowAdherence = stats.totalLogged >= 3 && stats.adherenceRate < 70;

  // Calculate detailed formula metrics for active prescriptions
  const detailedRx = activePrescriptions.map((rx) => ({
    rx,
    formula: parseDosageFormula(rx.dosage, rx.schedule),
    metrics: calculatePrescriptionMetrics(
      {
        startDate: rx.startDate,
        createdAt: rx.createdAt,
        dosage: rx.dosage,
        schedule: rx.schedule,
        quantity: rx.quantity,
      },
      rx.doseLogs
    ),
  }));

  return (
    <div className="space-y-5">
      {lowAdherence && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 text-sm text-rose-800 shadow-xs">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 animate-pulse" />
          <div>
            <p className="font-bold text-base">Low Adherence Intervention Flag</p>
            <p className="mt-0.5 text-xs text-rose-700">
              Customer compliance is at {stats.adherenceRate}% over the last 14 days ({stats.takenCount} taken, {stats.missedCount} missed).
              Schedule a pharmacist counseling session or send a dose follow-up notification.
            </p>
          </div>
        </div>
      )}

      {/* Stat Strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-[var(--admin-inset)] p-4 border border-[var(--admin-inset-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">14-Day Rate</span>
            <Activity className="h-4 w-4 admin-accent-text" />
          </div>
          <p className={`mt-2 text-3xl font-extrabold ${
            stats.adherenceRate >= 80 ? "text-emerald-700"
            : stats.adherenceRate >= 60 ? "text-amber-700"
            : "text-rose-700"
          }`}>
            {stats.adherenceRate}%
          </p>
          <p className="text-[10px] admin-soft mt-1">Strict calculated compliance</p>
        </div>

        <div className="rounded-2xl bg-[var(--admin-inset)] p-4 border border-[var(--admin-inset-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">Streak</span>
            <Award className="h-4 w-4 admin-accent-text" />
          </div>
          <p className="mt-2 text-3xl font-extrabold admin-text">{stats.currentStreakDays}d</p>
          <p className="text-[10px] admin-soft mt-1">Consecutive taken days</p>
        </div>

        <div className="rounded-2xl bg-[var(--admin-inset)] p-4 border border-[var(--admin-inset-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider admin-soft">Logged Doses</span>
            <Calendar className="h-4 w-4 admin-accent-text" />
          </div>
          <p className="mt-2 text-3xl font-extrabold admin-text">{stats.totalLogged}</p>
          <p className="text-[10px] admin-soft mt-1">Patient + Caregiver logs</p>
        </div>

        <div className="rounded-2xl bg-[var(--admin-inset)] p-4 border border-[var(--admin-inset-2)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Missed Doses</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-rose-700">{stats.missedCount}</p>
          <p className="text-[10px] text-rose-600 mt-1">Includes auto-missed past due</p>
        </div>
      </div>

      {/* 7-Day Visual Matrix */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider admin-soft">7-Day Adherence Visual Grid</p>
        <div className="grid grid-cols-7 gap-1.5">
          {stats.last7Days.map((d) => {
            const colors: Record<string, string> = {
              taken: "bg-emerald-500 text-white font-bold",
              late: "bg-amber-500 text-white font-bold",
              missed: "bg-rose-500 text-white font-bold",
              skipped: "bg-slate-400 text-white",
              unknown: "bg-slate-300 text-slate-700",
              none: "bg-[var(--admin-inset)] admin-soft",
            };
            return (
              <div
                key={d.date}
                className={`rounded-xl px-2 py-3 text-center transition ${colors[d.status]}`}
                title={`${d.date}: ${d.status}`}
              >
                <p className="text-[9px] uppercase opacity-80">
                  {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" })}
                </p>
                <p className="text-xs font-extrabold mt-0.5">
                  {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { day: "numeric", timeZone: "Africa/Nairobi" })}
                </p>
                <p className="mt-1 text-[9px] font-extrabold uppercase tracking-tight">
                  {d.status === "none" ? "—" : d.status}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calculated Prescription Dosage Breakdown */}
      <div>
        <p className="mb-2.5 text-xs font-bold uppercase tracking-wider admin-soft">Calculated Medication Inventory & Adherence</p>
        {detailedRx.length === 0 ? (
          <p className="text-xs admin-soft">No active prescriptions for this customer.</p>
        ) : (
          <div className="space-y-2">
            {detailedRx.map(({ rx, formula, metrics }) => (
              <div
                key={rx.id}
                className="rounded-2xl border border-[var(--admin-inset-2)] bg-[var(--admin-inset)] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 admin-accent-text" />
                    <div>
                      <span className="font-bold admin-text">{rx.medicineName}</span>
                      <span className="ml-2 font-mono text-[11px] admin-soft">Formula: {formula.formulaLabel}</span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      metrics.adherenceRate >= 80
                        ? "bg-emerald-100 text-emerald-800"
                        : metrics.adherenceRate >= 60
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {metrics.adherenceRate}% Adherence
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] admin-soft">
                  <span>Stock Remaining: {metrics.unitsRemaining} / {metrics.totalQuantity} units (~{metrics.daysRemaining} days supply)</span>
                  <span>{metrics.takenDosesCount} taken · {metrics.missedDosesCount} missed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Trail */}
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider admin-soft">Recent Granular Dose Audit Logs</p>
        {recentDoses.length === 0 ? (
          <p className="text-xs admin-soft">No dose logs recorded.</p>
        ) : (
          <ul className="space-y-1.5">
            {recentDoses.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--admin-inset-2)] px-3 py-2 text-xs bg-white/40"
              >
                <div>
                  <span className="font-bold admin-text">{d.prescription.medicineName}</span>
                  <span className="ml-2 text-[11px] admin-soft">
                    {formatDate(d.scheduledDate)} {d.scheduledTime ? `@ ${d.scheduledTime}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      d.status === "taken" ? "bg-emerald-100 text-emerald-800"
                      : d.status === "missed" ? "bg-rose-100 text-rose-800"
                      : d.status === "late" ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.status}
                  </span>
                  <span className="text-[10px] admin-soft">
                    by {d.recordedBy} {d.caregiverId ? "(caregiver)" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
