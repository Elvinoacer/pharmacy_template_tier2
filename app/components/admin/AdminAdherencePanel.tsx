import "server-only";

import { prisma } from "@/app/lib/db";
import {
  getAdherenceStatsForCustomer,
  getAdherencePerPrescription,
} from "@/app/lib/services/adherence";
import { formatDate } from "@/app/lib/time";
import { Activity, TrendingUp, Calendar, Award, AlertTriangle } from "lucide-react";

/**
 * Admin-side medication adherence panel. Rendered on the customer detail page.
 * Shows the same adherence metrics the caregiver sees, plus a flag for low
 * adherence (<70%) so pharmacists can intervene early.
 *
 * This is a server component — fetches data on render.
 */
export async function AdminAdherencePanel({ customerId }: { customerId: string }) {
  const [stats, perRx, recentDoses] = await Promise.all([
    getAdherenceStatsForCustomer(customerId, 14),
    getAdherencePerPrescription(customerId, 14),
    prisma.doseLog.findMany({
      where: { customerId },
      include: { prescription: { select: { medicineName: true } } },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const lowAdherence = stats.totalLogged >= 5 && stats.adherenceRate < 70;

  return (
    <div className="space-y-4">
      {lowAdherence && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Low adherence detected</p>
            <p className="text-xs">
              {stats.adherenceRate}% over the last 14 days ({stats.takenCount} taken, {stats.missedCount} missed).
              Consider a follow-up call or refill counseling session.
            </p>
          </div>
        </div>
      )}

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <Activity className="h-4 w-4 admin-accent-text" />
          <p className={`mt-1 text-2xl font-bold ${
            stats.adherenceRate >= 80 ? "text-emerald-700"
            : stats.adherenceRate >= 60 ? "text-amber-700"
            : "text-rose-700"
          }`}>
            {stats.adherenceRate}%
          </p>
          <p className="text-[10px] uppercase tracking-wide admin-soft">14-day rate</p>
        </div>
        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <Award className="h-4 w-4 admin-accent-text" />
          <p className="mt-1 text-2xl font-bold admin-text">{stats.currentStreakDays}d</p>
          <p className="text-[10px] uppercase tracking-wide admin-soft">Current streak</p>
        </div>
        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <Calendar className="h-4 w-4 admin-accent-text" />
          <p className="mt-1 text-2xl font-bold admin-text">{stats.totalLogged}</p>
          <p className="text-[10px] uppercase tracking-wide admin-soft">Doses logged</p>
        </div>
        <div className="rounded-xl bg-[var(--admin-inset)] p-3">
          <TrendingUp className="h-4 w-4 admin-accent-text" />
          <p className="mt-1 text-2xl font-bold text-rose-700">{stats.missedCount}</p>
          <p className="text-[10px] uppercase tracking-wide admin-soft">Missed</p>
        </div>
      </div>

      {/* Last 7 days calendar */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide admin-soft">Last 7 days</p>
        <div className="grid grid-cols-7 gap-1.5">
          {stats.last7Days.map((d) => {
            const colors: Record<string, string> = {
              taken: "bg-emerald-500 text-white",
              late: "bg-orange-400 text-white",
              missed: "bg-rose-500 text-white",
              skipped: "bg-amber-400 text-white",
              unknown: "bg-slate-400 text-white",
              none: "bg-[var(--admin-inset)] admin-soft",
            };
            return (
              <div
                key={d.date}
                className={`rounded-lg px-2 py-3 text-center ${colors[d.status]}`}
                title={`${d.date}: ${d.status}`}
              >
                <p className="text-[9px] uppercase opacity-80">
                  {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { weekday: "short", timeZone: "Africa/Nairobi" })}
                </p>
                <p className="text-[10px] font-semibold opacity-90">
                  {new Date(d.date + "T00:00:00Z").toLocaleDateString("en-KE", { day: "numeric", timeZone: "Africa/Nairobi" })}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase">
                  {d.status === "none" ? "—" : d.status}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-prescription */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide admin-soft">Per medication (14 days)</p>
        {perRx.length === 0 ? (
          <p className="text-xs admin-soft">No active prescriptions.</p>
        ) : (
          <ul className="space-y-1.5">
            {perRx.map((rx) => (
              <li
                key={rx.prescriptionId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--admin-inset)] px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold admin-text">{rx.medicineName}</p>
                  <p className="text-[10px] admin-soft">
                    {rx.dosage || "—"} · {rx.loggedCount} logs
                  </p>
                </div>
                {rx.adherenceRate != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      rx.adherenceRate >= 80
                        ? "bg-emerald-100 text-emerald-700"
                        : rx.adherenceRate >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {rx.adherenceRate}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recent dose log */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide admin-soft">Recent dose logs</p>
        {recentDoses.length === 0 ? (
          <p className="text-xs admin-soft">No dose logs recorded.</p>
        ) : (
          <ul className="space-y-1">
            {recentDoses.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--admin-inset)] px-3 py-1.5 text-xs"
              >
                <div>
                  <span className="font-semibold admin-text">{d.prescription.medicineName}</span>
                  <span className="ml-2 admin-soft">
                    {formatDate(d.scheduledDate)}
                    {d.scheduledTime ? ` · ${d.scheduledTime}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      d.status === "taken" ? "bg-emerald-100 text-emerald-700"
                      : d.status === "missed" ? "bg-rose-100 text-rose-700"
                      : d.status === "late" ? "bg-orange-100 text-orange-700"
                      : d.status === "skipped" ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {d.status}
                  </span>
                  <span className="text-[10px] admin-soft">
                    by {d.recordedBy}
                    {d.caregiverId ? " (caregiver)" : ""}
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
