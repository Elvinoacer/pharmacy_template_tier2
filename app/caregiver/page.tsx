import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { formatDate, formatDateTime, formatTime } from "@/app/lib/time";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { DoseConfirmButton } from "@/app/components/caregiver/DoseConfirmButton";
import { getAdherenceStatsForCustomer, getAdherencePerPrescription } from "@/app/lib/services/adherence";
import { getTodaysDosesForCustomer } from "@/app/lib/services/medication-schedule";
import {
  HeartHandshake,
  Pill,
  Bell,
  Activity,
  FileText,
  Plus,
  User,
  Clock,
  Check,
  X,
  TrendingUp,
  CalendarDays,
} from "lucide-react";

export const metadata = { title: "Caregiver dashboard" };

/**
 * Caregiver dashboard. Shows:
 *   - Patients the caregiver supports (with quick stats)
 *   - Today's dose checklist across all patients
 *   - Active refill requests for linked patients
 *   - Pickup-ready notifications
 *   - Adherence summary tile per patient
 *
 * Caregivers have NO access to customer profile editing, CRM, loyalty, campaigns,
 * or admin functions. They can only:
 *   - View patients + their medications
 *   - Request refills (if canRequestRefills = true)
 *   - Log adherence (if canLogAdherence = true)
 *   - Receive pickup notifications (if canReceivePickupNotifications = true)
 *   - View medication reminders + adherence summary (always read-only)
 */
export default async function CaregiverPortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver");

  // Find active caregiver links for this user.
  const links = await prisma.caregiver.findMany({
    where: {
      caregiverUserId: user.id,
      status: "active",
    },
    include: {
      customer: {
        include: {
          prescriptions: {
            where: { status: "active" },
            orderBy: { medicineName: "asc" },
            take: 30,
          },
          refillRequests: {
            where: { status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          notifications: {
            where: { deletedAt: null, type: { in: ["refill", "pickup", "reminder"] } },
            orderBy: { createdAt: "desc" },
            take: 8,
          },
          reminders: {
            where: {
              status: { in: ["scheduled", "sent"] },
              scheduledFor: { gte: new Date() },
            },
            orderBy: { scheduledFor: "asc" },
            take: 5,
          },
        },
      },
    },
  });

  if (links.length === 0 && user.role !== "caregiver") {
    if (user.role === "customer" || user.customerId) redirect("/portal");
    redirect("/admin");
  }

  // Fetch adherence stats + today's doses for each linked patient in parallel.
  const patientData = await Promise.all(
    links.map(async (link) => {
      const [stats, perRx, todaysDoses] = await Promise.all([
        getAdherenceStatsForCustomer(link.customerId, 14),
        getAdherencePerPrescription(link.customerId, 14),
        getTodaysDosesForCustomer(link.customerId),
      ]);
      return { link, stats, perRx, todaysDoses };
    }),
  );

  // Aggregate metrics across all patients.
  const totalPatients = links.length;
  const totalOpenRefills = links.reduce(
    (sum, l) => sum + l.customer.refillRequests.filter((r) => r.status !== "ready_for_pickup").length,
    0,
  );
  const totalReadyPickups = links.reduce(
    (sum, l) => sum + l.customer.refillRequests.filter((r) => r.status === "ready_for_pickup").length,
    0,
  );
  const totalDosesToday = patientData.reduce(
    (sum, p) => sum + p.todaysDoses.length,
    0,
  );
  const totalDosesPendingToday = patientData.reduce(
    (sum, p) => sum + p.todaysDoses.filter((d) => !d.doseLog).length,
    0,
  );

  return (
    <CaregiverShell
      user={user}
      title="Caregiver dashboard"
      subtitle="Track medications, request refills, and log adherence on behalf of your patients."
    >
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCardLink
          href="/caregiver/patients"
          icon={User}
          label="Patients supported"
          value={totalPatients}
          accent="brand"
        />
        <StatCardLink
          href="/caregiver/refills"
          icon={Pill}
          label="Open refill requests"
          value={totalOpenRefills}
          accent="info"
        />
        <StatCardLink
          href="/caregiver/notifications"
          icon={Bell}
          label="Ready for pickup"
          value={totalReadyPickups}
          accent="accent"
        />
        <StatCardLink
          href="/caregiver/adherence"
          icon={Activity}
          label="Doses pending today"
          value={`${totalDosesPendingToday}/${totalDosesToday}`}
          accent="neutral"
        />
      </div>

      {/* Today's dose checklist (across all patients) */}
      <section className="mt-5 card-premium p-4 sm:mt-6 sm:p-5 lg:p-6">
        <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0c1a14]">
              <CalendarDays className="h-4 w-4 text-[#0d6e5a]" /> Today's dose checklist
            </h2>
            <p className="mt-0.5 text-sm text-[#5a6b62]">
              Tap "Taken" / "Missed" to log doses on behalf of patients who granted you adherence permission.
            </p>
          </div>
          <Link
            href="/caregiver/adherence"
            className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-[#0d6e5a] hover:bg-[#e6f4ef] hover:underline"
          >
            View adherence →
          </Link>
        </div>

        {totalDosesToday === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e3ebe6] px-4 py-6 text-center">
            <Check className="mx-auto h-8 w-8 text-[#8a9a92]" />
            <p className="mt-1 text-sm text-[#5a6b62]">No scheduled doses for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {patientData.map(({ link, todaysDoses }) => (
              <div key={link.id} className="min-w-0 rounded-xl border border-[#e3ebe6] bg-[#fafbfa] p-3 sm:p-4">
                <div className="mb-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0c1a14]">{link.customer.fullName}</p>
                    <p className="text-sm text-[#5a6b62]">
                      {link.relationship || "Caregiver"}
                      {!link.canLogAdherence && " · Read-only (no adherence permission)"}
                    </p>
                  </div>
                  <Link
                    href={`/caregiver/patients/${link.customerId}`}
                    className="inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-[#0d6e5a] hover:bg-[#e6f4ef] hover:underline"
                  >
                    View patient →
                  </Link>
                </div>
                <ul className="space-y-1.5">
                  {todaysDoses.map((d) => (
                    <li
                      key={d.scheduleId}
                      className="flex min-w-0 flex-col items-stretch gap-3 rounded-xl bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0c1a14]">
                          {d.medicineName}
                          {d.label ? <span className="ml-1 text-[#8a9a92]">· {d.label}</span> : null}
                        </p>
                        <p className="text-sm text-[#5a6b62]">
                          {d.timeOfDay}
                          {d.dosage ? ` · ${d.dosage}` : ""}
                          {d.doseLog ? ` · already logged as ${d.doseLog.status}` : ""}
                        </p>
                      </div>
                      {link.canLogAdherence && (
                        <DoseConfirmButton
                          actor="caregiver"
                          customerId={link.customerId}
                          prescriptionId={d.prescriptionId}
                          scheduleId={d.scheduleId}
                          scheduledTime={d.timeOfDay}
                          medicineName={d.medicineName}
                          initialStatus={
                            d.doseLog?.status === "taken" || d.doseLog?.status === "missed" || d.doseLog?.status === "skipped" || d.doseLog?.status === "late"
                              ? (d.doseLog.status as "taken" | "missed" | "skipped" | "late")
                              : null
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Patients list with adherence + medications */}
      <section className="mt-6 space-y-4">
        <h2 className="text-base font-semibold text-[#0c1a14]">Patients you support</h2>
        {patientData.length === 0 ? (
          <div className="rounded-2xl border border-[#e3ebe6] bg-white p-5 text-center sm:p-8">
            <User className="mx-auto h-10 w-10 text-[#8a9a92]" />
            <p className="mt-3 font-semibold text-[#0c1a14]">No linked patients yet</p>
            <p className="mt-1 text-sm text-[#5a6b62]">
              Accept a caregiver invitation link from a patient to get started.
            </p>
          </div>
        ) : (
          patientData.map(({ link, stats, perRx }) => {
            const patient = link.customer;
            const readyPickups = patient.refillRequests.filter((r) => r.status === "ready_for_pickup");

            return (
              <section
                key={link.id}
                className="card-premium min-w-0 p-4 sm:p-5 lg:p-6"
              >
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#0c1a14]">{patient.fullName}</h3>
                    <p className="text-sm text-[#5a6b62]">
                      Relationship: {link.relationship || "Caregiver"}
                      {link.canRequestRefills ? " · Can request refills" : ""}
                      {link.canLogAdherence ? " · Can log adherence" : ""}
                      {link.canReceivePickupNotifications ? " · Pickup alerts on" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {stats.adherenceRate !== null && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                          stats.adherenceRate >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : stats.adherenceRate >= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        <Activity className="h-3 w-3" /> {stats.adherenceRate}% adherence
                      </span>
                    )}
                    <Link
                      href={`/caregiver/patients/${patient.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-3 py-1 text-sm font-semibold text-[#0d6e5a] hover:bg-[#d5efe6]"
                    >
                      View patient →
                    </Link>
                  </div>
                </div>

                {/* Adherence mini-stats */}
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
                  <div className="rounded-lg bg-[#f4f7f4] px-3 py-2">
                    <p className="text-sm uppercase tracking-wide text-[#8a9a92]">14-day rate</p>
                    <p className="text-sm font-bold text-[#0c1a14]">{stats.adherenceRate}%</p>
                  </div>
                  <div className="rounded-lg bg-[#f4f7f4] px-3 py-2">
                    <p className="text-sm uppercase tracking-wide text-[#8a9a92]">Taken</p>
                    <p className="text-sm font-bold text-emerald-700">{stats.takenCount}</p>
                  </div>
                  <div className="rounded-lg bg-[#f4f7f4] px-3 py-2">
                    <p className="text-sm uppercase tracking-wide text-[#8a9a92]">Missed</p>
                    <p className="text-sm font-bold text-rose-700">{stats.missedCount}</p>
                  </div>
                  <div className="rounded-lg bg-[#f4f7f4] px-3 py-2">
                    <p className="text-sm uppercase tracking-wide text-[#8a9a92]">Streak</p>
                    <p className="text-sm font-bold text-[#0d6e5a]">{stats.currentStreakDays}d</p>
                  </div>
                </div>

                {/* Last 7 days mini-calendar */}
                <div className="mt-3 flex gap-1">
                  {stats.last7Days.map((d) => {
                    const colors: Record<string, string> = {
                      taken: "bg-emerald-500",
                      late: "bg-orange-400",
                      missed: "bg-rose-500",
                      skipped: "bg-amber-400",
                      unknown: "bg-slate-400",
                      none: "bg-slate-200",
                    };
                    return (
                      <div
                        key={d.date}
                        title={`${d.date}: ${d.status}`}
                        className={`h-2 flex-1 rounded-full ${colors[d.status]}`}
                      />
                    );
                  })}
                </div>

                {/* Prescriptions */}
                <div className="mt-5">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#8a9a92]">
                    <FileText className="h-3 w-3" /> Active medications
                  </p>
                  {patient.prescriptions.length === 0 ? (
                    <p className="text-sm text-[#5a6b62]">No active prescriptions on file.</p>
                  ) : (
                    <ul className="space-y-2">
                      {patient.prescriptions.map((p) => (
                        <li
                          key={p.id}
                          className="flex min-w-0 flex-col items-stretch gap-3 rounded-xl bg-[#f4f7f4] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0c1a14]">{p.medicineName}</p>
                            <p className="text-sm text-[#5a6b62]">
                              {p.dosage || "—"} · {p.refillsRemaining ?? 0} refills left
                              {p.nextRefillDue ? ` · due ${formatDate(p.nextRefillDue)}` : ""}
                            </p>
                          </div>
                          {link.canRequestRefills && (p.refillsRemaining ?? 0) > 0 && (
                            <Link
                              href={`/caregiver/refills/new?customerId=${patient.id}&prescriptionId=${p.id}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1 text-sm font-semibold text-white hover:bg-[#084c3f]"
                            >
                              <Plus className="h-3 w-3" /> Request refill
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Active refills + pickup notifications */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#8a9a92]">
                      <Pill className="h-3 w-3" /> Open refill requests
                    </p>
                    {patient.refillRequests.length === 0 ? (
                      <p className="text-sm text-[#5a6b62]">None in progress.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {patient.refillRequests.map((r) => (
                          <li key={r.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-sm">
                            <span className="font-semibold text-[#0c1a14]">{r.medicineName}</span>
                            <span className="ml-2 capitalize text-[#5a6b62]">
                              {r.status.replace(/_/g, " ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#8a9a92]">
                      <Bell className="h-3 w-3" /> Pickup notifications
                    </p>
                    {readyPickups.length > 0 ? (
                      <ul className="space-y-1.5">
                        {readyPickups.map((r) => (
                          <li
                            key={r.id}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                          >
                            <strong>{r.medicineName}</strong> is ready for pickup
                          </li>
                        ))}
                      </ul>
                    ) : patient.notifications.length > 0 ? (
                      <ul className="space-y-1.5">
                        {patient.notifications.slice(0, 4).map((n) => (
                          <li key={n.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-sm text-[#5a6b62]">
                            {n.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[#5a6b62]">No pickup alerts right now.</p>
                    )}
                  </div>
                </div>

                {/* Upcoming reminders */}
                {patient.reminders.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#8a9a92]">
                      <Clock className="h-3 w-3" /> Upcoming reminders
                    </p>
                    <ul className="space-y-1.5">
                      {patient.reminders.map((r) => (
                        <li key={r.id} className="flex items-center justify-between rounded-lg bg-[#f4f7f4] px-3 py-2 text-sm">
                          <span className="font-medium text-[#0c1a14]">{r.title}</span>
                          <span className="text-[#5a6b62]">{formatDateTime(r.scheduledFor)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })
        )}
      </section>
    </CaregiverShell>
  );
}

function StatCardLink({
  href,
  icon: Icon,
  label,
  value,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent?: "brand" | "accent" | "info" | "neutral";
}) {
  const accentClass =
    accent === "accent"
      ? "from-amber-400 to-amber-600"
      : accent === "info"
        ? "from-blue-400 to-blue-600"
        : accent === "neutral"
          ? "from-slate-400 to-slate-600"
          : "from-[#0d6e5a] to-[#084c3f]";

  return (
    <Link href={href} className="card-stat block min-h-11 transition hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#5a6b62]">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-[#0c1a14]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accentClass} text-white shadow-md`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
