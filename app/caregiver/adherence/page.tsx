import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer, getAdherencePerPrescription } from "@/app/lib/services/adherence";
import { Activity, TrendingUp, Calendar, Award } from "lucide-react";

export const metadata = { title: "Adherence" };

export default async function CaregiverAdherencePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/adherence");

  const links = await getActiveCaregiverLinks(user.id);

  // Fetch adherence stats for each patient.
  const patientStats = await Promise.all(
    links.map(async (link) => {
      const [stats, perRx] = await Promise.all([
        getAdherenceStatsForCustomer(link.customerId, 14),
        getAdherencePerPrescription(link.customerId, 14),
      ]);
      return { link, stats, perRx };
    }),
  );

  return (
    <CaregiverShell
      user={user}
      title="Adherence summary"
      subtitle="14-day adherence trends for the patients you support. Use this to spot missed doses early."
    >
      {patientStats.length === 0 ? (
        <div className="rounded-2xl border border-[#e3ebe6] bg-white p-8 text-center">
          <Activity className="mx-auto h-10 w-10 text-[#8a9a92]" />
          <p className="mt-3 font-semibold text-[#0c1a14]">No linked patients yet</p>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Accept a caregiver invitation to start tracking patient adherence.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {patientStats.map(({ link, stats, perRx }) => (
            <section key={link.id} className="card-premium p-5">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#0c1a14]">{link.customer.fullName}</h2>
                  <p className="text-xs text-[#5a6b62]">
                    {link.relationship || "Caregiver"}
                    {!link.canLogAdherence && " · Read-only (patient has not granted adherence permission)"}
                  </p>
                </div>
                <Link
                  href={`/caregiver/patients/${link.customerId}`}
                  className="text-xs font-semibold text-[#0d6e5a] hover:underline"
                >
                  View patient →
                </Link>
              </div>

              {/* Big stat row */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-gradient-to-br from-[#0d6e5a]/10 to-[#0d6e5a]/5 p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#0d6e5a]">
                    <Activity className="h-3 w-3" /> 14-day adherence
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${stats.adherenceRate >= 80 ? "text-emerald-700" : stats.adherenceRate >= 60 ? "text-amber-700" : "text-rose-700"}`}>
                    {stats.adherenceRate}%
                  </p>
                </div>
                <div className="rounded-xl bg-[#f4f7f4] p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                    <Award className="h-3 w-3" /> Current streak
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#0d6e5a]">{stats.currentStreakDays}d</p>
                </div>
                <div className="rounded-xl bg-[#f4f7f4] p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                    <Calendar className="h-3 w-3" /> Doses logged
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#0c1a14]">{stats.totalLogged}</p>
                </div>
                <div className="rounded-xl bg-[#f4f7f4] p-3">
                  <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#8a9a92]">
                    <TrendingUp className="h-3 w-3" /> Missed doses
                  </p>
                  <p className="mt-1 text-2xl font-bold text-rose-700">{stats.missedCount}</p>
                </div>
              </div>

              {/* Last 7 days calendar */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a9a92]">
                  Last 7 days
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {stats.last7Days.map((d) => {
                    const colors: Record<string, string> = {
                      taken: "bg-emerald-500 text-white",
                      late: "bg-orange-400 text-white",
                      missed: "bg-rose-500 text-white",
                      skipped: "bg-amber-400 text-white",
                      unknown: "bg-slate-400 text-white",
                      none: "bg-slate-100 text-slate-500",
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

              {/* Weekly trend bar */}
              <div className="mt-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a9a92]">
                  Weekly trend (4 weeks)
                </p>
                <div className="flex items-end gap-3" style={{ height: 100 }}>
                  {stats.weeklyTrend.map((w) => (
                    <div key={w.weekLabel} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] font-semibold text-[#0c1a14]">{w.rate}%</span>
                      <div
                        className={`w-full rounded-t-md ${
                          w.rate >= 80 ? "bg-emerald-500"
                          : w.rate >= 60 ? "bg-amber-500"
                          : w.rate > 0 ? "bg-rose-500"
                          : "bg-slate-200"
                        }`}
                        style={{ height: `${Math.max(2, w.rate)}%` }}
                      />
                      <span className="text-[9px] text-[#8a9a92]">{w.weekLabel}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-prescription breakdown */}
              <div className="mt-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#8a9a92]">
                  Per medication
                </p>
                {perRx.length === 0 ? (
                  <p className="text-xs text-[#5a6b62]">No active prescriptions.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {perRx.map((rx) => (
                      <li
                        key={rx.prescriptionId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f4f7f4] px-3 py-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0c1a14]">{rx.medicineName}</p>
                          <p className="text-[10px] text-[#5a6b62]">
                            {rx.dosage || "—"} · {rx.loggedCount} logs in last 14 days
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
            </section>
          ))}
        </div>
      )}
    </CaregiverShell>
  );
}
