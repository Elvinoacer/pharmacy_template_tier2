import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { getActiveCaregiverLinks } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer, getAdherencePerPrescription } from "@/app/lib/services/adherence";
import { DoseConfirmButton } from "@/app/components/caregiver/DoseConfirmButton";
import { formatDate, PROJECT_LOCALE, PROJECT_TIMEZONE } from "@/app/lib/time";
import { Activity, TrendingUp, Calendar, Award, AlertTriangle, ShieldAlert, CheckCircle2, UserCheck, ArrowRight } from "lucide-react";

export const metadata = { title: "Adherence Command Center" };

export default async function CaregiverAdherencePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver/adherence");

  const links = await getActiveCaregiverLinks(user.id);

  // Fetch adherence stats & recent dose logs for each patient.
  const patientStats = await Promise.all(
    links.map(async (link) => {
      const [stats, perRx, recentLogs] = await Promise.all([
        getAdherenceStatsForCustomer(link.customerId, 14),
        getAdherencePerPrescription(link.customerId, 14),
        prisma.doseLog.findMany({
          where: { customerId: link.customerId },
          include: { prescription: { select: { medicineName: true } } },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
      ]);
      return { link, stats, perRx, recentLogs };
    })
  );

  // Aggregate command center metrics
  const totalPatients = patientStats.length;
  const avgAdherence = totalPatients > 0
    ? Math.round(patientStats.reduce((acc, p) => acc + p.stats.adherenceRate, 0) / totalPatients)
    : 100;
  const totalMissedCount = patientStats.reduce((acc, p) => acc + p.stats.missedCount, 0);
  const patientsAtRisk = patientStats.filter((p) => p.stats.adherenceRate < 75 || p.stats.missedCount > 0);

  return (
    <CaregiverShell
      user={user}
      title="Adherence & Activity Operations"
      subtitle="Real-time 14-day adherence tracking, missed dose alerts, and caregiver action center."
    >
      {patientStats.length === 0 ? (
        <div className="rounded-3xl border border-[#e3ebe6] bg-white p-12 text-center shadow-sm">
          <Activity className="mx-auto h-12 w-12 text-[#8a9a92]" />
          <h3 className="mt-4 text-lg font-bold text-[#0c1a14]">No linked patients yet</h3>
          <p className="mt-1 text-sm text-[#5a6b62]">
            Accept a caregiver invitation from your patient to start monitoring their daily dosage adherence.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Operational Command Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white to-[#f4f7f4] p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">Supported Patients</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0d6e5a]/10 text-[#0d6e5a]">
                  <UserCheck className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-[#0c1a14]">{totalPatients}</p>
              <p className="mt-1 text-[11px] text-[#5a6b62]">Linked active patient accounts</p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white to-emerald-50/40 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5a6b62]">Avg Adherence Rate</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                </span>
              </div>
              <p className={`mt-3 text-3xl font-extrabold ${avgAdherence >= 85 ? "text-emerald-700" : avgAdherence >= 70 ? "text-amber-700" : "text-rose-700"}`}>
                {avgAdherence}%
              </p>
              <p className="mt-1 text-[11px] text-[#5a6b62]">14-day calculated patient compliance</p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white to-rose-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Missed Doses Watchlist</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-rose-700">{totalMissedCount}</p>
              <p className="mt-1 text-[11px] text-rose-700">Total missed doses in last 14 days</p>
            </div>

            <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white to-amber-50/50 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Patients at Risk</span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold text-amber-700">{patientsAtRisk.length}</p>
              <p className="mt-1 text-[11px] text-amber-700">Require caregiver follow-up action</p>
            </div>
          </div>

          {/* Patients At Risk Action Watchlist */}
          {patientsAtRisk.length > 0 && (
            <div className="overflow-hidden rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-500/10 via-rose-50 to-amber-50 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-rose-800 mb-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="font-bold text-base">Action Required: Patients Needing Attention</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {patientsAtRisk.map(({ link, stats }) => (
                  <div key={link.id} className="flex items-center justify-between rounded-2xl bg-white/90 p-4 border border-rose-100 shadow-2xs">
                    <div>
                      <h4 className="font-bold text-sm text-[#0c1a14]">{link.customer.fullName}</h4>
                      <p className="text-xs text-rose-700 font-semibold mt-0.5">
                        Adherence Rate: {stats.adherenceRate}% · {stats.missedCount} Missed Doses
                      </p>
                    </div>
                    <Link
                      href={`/caregiver/patients/${link.customerId}`}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                    >
                      Take Action <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per Patient Dashboard Cards */}
          <div className="space-y-6">
            {patientStats.map(({ link, stats, perRx, recentLogs }) => (
              <section key={link.id} className="rounded-3xl border border-[#e3ebe6] bg-white p-6 shadow-sm transition hover:shadow-md">
                {/* Header */}
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#e3ebe6]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-[#0c1a14]">{link.customer.fullName}</h2>
                      <span className="rounded-full bg-[#e6f4ef] px-3 py-0.5 text-xs font-bold text-[#0d6e5a]">
                        {link.relationship || "Caregiver"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#5a6b62]">
                      {link.canLogAdherence
                        ? "✓ Granted Adherence Permission — You can confirm doses on behalf of patient"
                        : "🔒 Read-only view (patient has not granted logging permission)"}
                    </p>
                  </div>

                  <Link
                    href={`/caregiver/patients/${link.customerId}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6e5a] hover:underline"
                  >
                    Full Patient Profile →
                  </Link>
                </div>

                {/* Big Stat Row */}
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-gradient-to-br from-[#0d6e5a]/10 to-[#0d6e5a]/5 p-4">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0d6e5a]">
                      <Activity className="h-3.5 w-3.5" /> 14-Day Rate
                    </p>
                    <p className={`mt-2 text-3xl font-extrabold ${
                      stats.adherenceRate >= 80 ? "text-emerald-700" : stats.adherenceRate >= 60 ? "text-amber-700" : "text-rose-700"
                    }`}>
                      {stats.adherenceRate}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#f4f7f4] p-4">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#8a9a92]">
                      <Award className="h-3.5 w-3.5 text-[#0d6e5a]" /> Streak
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-[#0d6e5a]">{stats.currentStreakDays}d</p>
                  </div>

                  <div className="rounded-2xl bg-[#f4f7f4] p-4">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#8a9a92]">
                      <Calendar className="h-3.5 w-3.5" /> Doses Logged
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-[#0c1a14]">{stats.totalLogged}</p>
                  </div>

                  <div className="rounded-2xl bg-[#f4f7f4] p-4">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#8a9a92]">
                      <TrendingUp className="h-3.5 w-3.5 text-rose-600" /> Missed
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-rose-700">{stats.missedCount}</p>
                  </div>
                </div>

                {/* Last 7 Days Dot Matrix */}
                <div className="mt-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                    7-Day Visual Adherence Calendar
                  </p>
                  <div className="grid grid-cols-7 gap-2">
                    {stats.last7Days.map((d) => {
                      const colors: Record<string, string> = {
                        taken: "bg-emerald-500 text-white shadow-xs",
                        late: "bg-amber-500 text-white shadow-xs",
                        missed: "bg-rose-500 text-white shadow-xs",
                        skipped: "bg-slate-400 text-white",
                        unknown: "bg-slate-300 text-slate-700",
                        none: "bg-slate-100 text-slate-400",
                      };
                      return (
                        <div
                          key={d.date}
                          className={`rounded-xl px-2 py-3 text-center transition ${colors[d.status]}`}
                          title={`${d.date}: ${d.status}`}
                        >
                          <p className="text-[10px] uppercase font-semibold opacity-80">
                            {new Date(d.date + "T00:00:00Z").toLocaleDateString(PROJECT_LOCALE, {
                              weekday: "short",
                              timeZone: PROJECT_TIMEZONE,
                            })}
                          </p>
                          <p className="text-xs font-extrabold mt-0.5">
                            {new Date(d.date + "T00:00:00Z").toLocaleDateString(PROJECT_LOCALE, {
                              day: "numeric",
                              timeZone: PROJECT_TIMEZONE,
                            })}
                          </p>
                          <p className="mt-1 text-[9px] font-extrabold uppercase tracking-tight">
                            {d.status === "none" ? "—" : d.status}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per Medication Breakdown */}
                <div className="mt-6">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                    Active Medications & Compliance Breakdown
                  </p>
                  {perRx.length === 0 ? (
                    <p className="text-xs text-[#5a6b62]">No active prescriptions on file.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {perRx.map((rx) => (
                        <div
                          key={rx.prescriptionId}
                          className="flex items-center justify-between rounded-xl bg-[#f4f7f4] p-3 text-xs border border-[#e3ebe6]"
                        >
                          <div>
                            <p className="font-bold text-[#0c1a14]">{rx.medicineName}</p>
                            <p className="text-[11px] text-[#5a6b62]">{rx.dosage || "Standard Dose"}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {rx.adherenceRate != null && (
                              <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                  rx.adherenceRate >= 80
                                    ? "bg-emerald-100 text-emerald-800"
                                    : rx.adherenceRate >= 60
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {rx.adherenceRate}%
                              </span>
                            )}
                            {link.canLogAdherence && (
                              <DoseConfirmButton
                                customerId={link.customerId}
                                prescriptionId={rx.prescriptionId}
                                medicineName={rx.medicineName}
                                actor="caregiver"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Dose Activity Audit Trail */}
                {recentLogs.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[#e3ebe6]">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5a6b62]">
                      Recent Dose Activity Audit Trail
                    </p>
                    <div className="space-y-1.5">
                      {recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded-xl border border-black/5 bg-[#fafbfa] px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#0c1a14]">{log.prescription.medicineName}</span>
                            <span className="ml-2 text-[11px] text-[#8a9a92]">
                              {formatDate(log.scheduledDate)}{log.scheduledTime ? ` @ ${log.scheduledTime}` : ""}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${
                                log.status === "taken" ? "bg-emerald-100 text-emerald-800"
                                : log.status === "late" ? "bg-amber-100 text-amber-800"
                                : log.status === "missed" ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="text-[10px] text-[#8a9a92]">
                              by {log.recordedBy}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      )}
    </CaregiverShell>
  );
}
