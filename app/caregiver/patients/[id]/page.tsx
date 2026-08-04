import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { CaregiverShell } from "@/app/components/caregiver/CaregiverShell";
import { DoseConfirmButton } from "@/app/components/caregiver/DoseConfirmButton";
import { requireCaregiverForPatient } from "@/app/lib/services/caregiver-permissions";
import { getAdherenceStatsForCustomer, getAdherencePerPrescription } from "@/app/lib/services/adherence";
import { getTodaysDosesForCustomer, getScheduleForPrescription } from "@/app/lib/services/medication-schedule";
import { formatDate, formatDateTime } from "@/app/lib/time";
import {
  ArrowLeft,
  Pill,
  FileText,
  Bell,
  Clock,
  Activity,
  CalendarDays,
  Check,
  X,
  Plus,
} from "lucide-react";

export const metadata = { title: "Patient detail" };

/**
 * Read-only patient detail for caregivers. Shows:
 *   - Patient basic info (name, relationship) — NO email, phone, address, DOB
 *   - Active prescriptions + per-prescription schedule
 *   - Today's doses with one-tap confirmation (if canLogAdherence)
 *   - Active refill requests + status
 *   - Pickup-ready notifications (if canReceivePickupNotifications)
 *   - Upcoming reminders
 *   - 14-day adherence summary with per-prescription breakdown
 *
 * Caregivers cannot: edit patient profile, create prescriptions, approve refills,
 * access CRM notes / loyalty / campaigns / admin features.
 */
export default async function CaregiverPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/caregiver");
  const { id: customerId } = await params;

  let link;
  try {
    link = await requireCaregiverForPatient(user, customerId);
  } catch {
    notFound();
  }

  const [patient, stats, perRx, todaysDoses, refillRequests, readyPickups, reminders] = await Promise.all([
    prisma.customerProfile.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        fullName: true,
        prescriptions: {
          where: { status: "active" },
          orderBy: { medicineName: "asc" },
        },
        refillRequests: {
          where: { status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        notifications: {
          where: { deletedAt: null, type: { in: ["refill", "pickup", "reminder"] } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        reminders: {
          where: { status: { in: ["scheduled", "sent"] }, scheduledFor: { gte: new Date() } },
          orderBy: { scheduledFor: "asc" },
          take: 10,
        },
      },
    }),
    getAdherenceStatsForCustomer(customerId, 14),
    getAdherencePerPrescription(customerId, 14),
    getTodaysDosesForCustomer(customerId),
    prisma.refillRequest.findMany({
      where: { customerId, status: { in: ["submitted", "under_review", "approved", "preparing", "ready_for_pickup"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.refillRequest.findMany({
      where: { customerId, status: "ready_for_pickup" },
    }),
    prisma.reminder.findMany({
      where: { customerId, status: { in: ["scheduled", "sent"] }, scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
      take: 10,
    }),
  ]);

  if (!patient) notFound();

  // Load schedule per prescription.
  const schedulesByRx = await Promise.all(
    patient.prescriptions.map(async (p) => ({
      prescriptionId: p.id,
      schedule: await getScheduleForPrescription(p.id),
    })),
  );
  const scheduleMap = new Map(schedulesByRx.map((s) => [s.prescriptionId, s.schedule]));

  return (
    <CaregiverShell
      user={user}
      title={patient.fullName}
      subtitle={`Relationship: ${link.relationship || "Caregiver"}`}
      actions={
        <Link
          href="/caregiver/patients"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ef] px-3 py-1.5 text-xs font-semibold text-[#0d6e5a] transition hover:bg-[#d5efe6]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All patients
        </Link>
      }
    >
      {/* Top stat strip */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="card-stat p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#8a9a92]">14-day adherence</p>
          <p className={`mt-1 text-xl font-bold ${stats.adherenceRate >= 80 ? "text-emerald-700" : stats.adherenceRate >= 60 ? "text-amber-700" : "text-rose-700"}`}>
            {stats.adherenceRate}%
          </p>
        </div>
        <div className="card-stat p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#8a9a92]">Doses logged (14d)</p>
          <p className="mt-1 text-xl font-bold text-[#0c1a14]">{stats.totalLogged}</p>
        </div>
        <div className="card-stat p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#8a9a92]">Current streak</p>
          <p className="mt-1 text-xl font-bold text-[#0d6e5a]">{stats.currentStreakDays}d</p>
        </div>
        <div className="card-stat p-4">
          <p className="text-[10px] uppercase tracking-wide text-[#8a9a92]">Active meds</p>
          <p className="mt-1 text-xl font-bold text-[#0c1a14]">{patient.prescriptions.length}</p>
        </div>
      </div>

      {/* Today's doses */}
      <section className="mt-6 card-premium p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0c1a14]">
            <CalendarDays className="h-4 w-4 text-[#0d6e5a]" /> Today's doses
          </h2>
          {!link.canLogAdherence && (
            <span className="text-[10px] font-semibold text-[#8a9a92]">Read-only — patient has not granted adherence permission</span>
          )}
        </div>
        {todaysDoses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#e3ebe6] px-4 py-6 text-center">
            <Check className="mx-auto h-8 w-8 text-[#8a9a92]" />
            <p className="mt-1 text-sm text-[#5a6b62]">No scheduled doses for today.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {todaysDoses.map((d) => (
              <li
                key={d.scheduleId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#f4f7f4] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0c1a14]">
                    {d.medicineName}
                    {d.label ? <span className="ml-1 text-[#8a9a92]">· {d.label}</span> : null}
                  </p>
                  <p className="text-[10px] text-[#5a6b62]">
                    {d.timeOfDay}
                    {d.dosage ? ` · ${d.dosage}` : ""}
                    {d.doseLog ? ` · already logged as ${d.doseLog.status}` : ""}
                  </p>
                </div>
                {link.canLogAdherence ? (
                  <DoseConfirmButton
                    actor="caregiver"
                    customerId={customerId}
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
                ) : d.doseLog ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-700">
                    {d.doseLog.status}
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-500">pending</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Medications + schedules */}
      <section className="mt-6 card-premium p-5">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#0c1a14]">
          <FileText className="h-4 w-4 text-[#0d6e5a]" /> Active medications
        </h2>
        {patient.prescriptions.length === 0 ? (
          <p className="text-sm text-[#5a6b62]">No active prescriptions on file.</p>
        ) : (
          <ul className="space-y-3">
            {patient.prescriptions.map((p) => {
              const schedule = scheduleMap.get(p.id) ?? [];
              const rxStats = perRx.find((s) => s.prescriptionId === p.id);
              return (
                <li key={p.id} className="rounded-xl border border-[#e3ebe6] bg-[#fafbfa] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0c1a14]">{p.medicineName}</p>
                      <p className="text-xs text-[#5a6b62]">
                        {p.dosage || "—"}
                        {p.refillsRemaining != null ? ` · ${p.refillsRemaining} refills left` : ""}
                        {p.nextRefillDue ? ` · due ${formatDate(p.nextRefillDue)}` : ""}
                        {p.schedule ? ` · ${p.schedule}` : ""}
                      </p>
                      {schedule.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {schedule.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ef] px-2 py-0.5 text-[10px] font-medium text-[#0d6e5a]"
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {s.timeOfDay}
                              {s.label ? ` · ${s.label}` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {rxStats?.adherenceRate != null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            rxStats.adherenceRate >= 80
                              ? "bg-emerald-100 text-emerald-700"
                              : rxStats.adherenceRate >= 60
                                ? "bg-amber-100 text-amber-700"
                                : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          <Activity className="h-2.5 w-2.5" /> {rxStats.adherenceRate}%
                        </span>
                      )}
                      {link.canRequestRefills && (p.refillsRemaining ?? 0) > 0 && (
                        <Link
                          href={`/caregiver/refills/new?customerId=${customerId}&prescriptionId=${p.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-[#0d6e5a] px-3 py-1 text-[10px] font-semibold text-white hover:bg-[#084c3f]"
                        >
                          <Plus className="h-3 w-3" /> Request refill
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Active refills + reminders + pickups */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card-premium p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
            <Pill className="h-4 w-4 text-[#0d6e5a]" /> Refill requests
          </h2>
          {refillRequests.length === 0 ? (
            <p className="text-xs text-[#5a6b62]">None in progress.</p>
          ) : (
            <ul className="space-y-1.5">
              {refillRequests.map((r) => (
                <li key={r.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-xs">
                  <span className="font-semibold text-[#0c1a14]">{r.medicineName}</span>
                  <span className="ml-2 capitalize text-[#5a6b62]">{r.status.replace(/_/g, " ")}</span>
                  <span className="block text-[10px] text-[#8a9a92]">{formatDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card-premium p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
            <Bell className="h-4 w-4 text-[#0d6e5a]" /> Pickup alerts
          </h2>
          {readyPickups.length > 0 ? (
            <ul className="space-y-1.5">
              {readyPickups.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                >
                  <strong>{r.medicineName}</strong> is ready for pickup.
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#5a6b62]">No pickups ready right now.</p>
          )}
        </section>

        <section className="card-premium p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0c1a14]">
            <Clock className="h-4 w-4 text-[#0d6e5a]" /> Upcoming reminders
          </h2>
          {reminders.length === 0 ? (
            <p className="text-xs text-[#5a6b62]">No upcoming reminders.</p>
          ) : (
            <ul className="space-y-1.5">
              {reminders.map((r) => (
                <li key={r.id} className="rounded-lg bg-[#f4f7f4] px-3 py-2 text-xs">
                  <p className="font-medium text-[#0c1a14]">{r.title}</p>
                  <p className="text-[10px] text-[#5a6b62]">{formatDateTime(r.scheduledFor)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </CaregiverShell>
  );
}
