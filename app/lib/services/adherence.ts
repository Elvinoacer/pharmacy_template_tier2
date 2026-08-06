import "server-only";

import { prisma } from "@/app/lib/db";
import { PROJECT_TIMEZONE } from "@/app/lib/time";

/**
 * Adherence service: statistics, dose logging, and trend calculations.
 *
 * Two layers of adherence data exist in this project:
 *
 * 1. `PrescriptionAdherence` (Level 1 — daily log): one record per prescription
 *    per day. Status taken | missed | skipped | late. Existing functionality.
 *
 * 2. `DoseLog` (Level 2 — per-dose log): one record per scheduled dose (e.g.
 *    a twice-daily med has two DoseLog rows per day). Status taken | missed |
 *    skipped | late | unknown. Includes who confirmed (customer/caregiver/system)
 *    and the schedule slot it relates to.
 *
 * The helpers below let the rest of the app read aggregated adherence metrics
 * without having to know about either layer.
 */

export type AdherenceStats = {
  customerId: string;
  // 14-day window
  windowDays: number;
  totalLogged: number;
  takenCount: number;
  missedCount: number;
  skippedCount: number;
  lateCount: number;
  unknownCount: number;
  adherenceRate: number; // (taken + late) / total, 0-100
  // weekly trend: rate for each of the last 4 weeks (oldest first)
  weeklyTrend: Array<{ weekLabel: string; rate: number; logged: number }>;
  // last 7 days detail (oldest first)
  last7Days: Array<{ date: string; status: "taken" | "missed" | "skipped" | "late" | "unknown" | "none" }>;
  currentStreakDays: number;
};

function localDateStr(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function localDateObj(d: Date): Date {
  return new Date(localDateStr(d) + "T00:00:00Z");
}

/**
 * Compute comprehensive adherence stats for a customer over the last N days
 * (default 14). Combines PrescriptionAdherence + DoseLog so the numbers stay
 * consistent regardless of which layer was used to log a dose.
 */
export async function getAdherenceStatsForCustomer(
  customerId: string,
  windowDays = 14,
): Promise<AdherenceStats> {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));
  const windowStartObj = localDateObj(windowStart);

  // Pull all adherence rows in the window for this customer.
  const [dailyLogs, doseLogs] = await Promise.all([
    prisma.prescriptionAdherence.findMany({
      where: { customerId, takenOn: { gte: windowStartObj } },
      select: { takenOn: true, status: true },
    }),
    prisma.doseLog.findMany({
      where: { customerId, scheduledDate: { gte: windowStartObj } },
      select: { scheduledDate: true, status: true },
    }),
  ]);

  // Merge: build a map of date -> { taken, missed, skipped, late, unknown, total }
  const byDate = new Map<string, { taken: number; missed: number; skipped: number; late: number; unknown: number; total: number }>();

  const bump = (dateKey: string, status: string) => {
    const entry = byDate.get(dateKey) ?? { taken: 0, missed: 0, skipped: 0, late: 0, unknown: 0, total: 0 };
    if (status === "taken") entry.taken += 1;
    else if (status === "missed") entry.missed += 1;
    else if (status === "skipped") entry.skipped += 1;
    else if (status === "late") entry.late += 1;
    else if (status === "unknown") entry.unknown += 1;
    entry.total += 1;
    byDate.set(dateKey, entry);
  };

  for (const log of dailyLogs) {
    bump(localDateStr(log.takenOn), log.status);
  }
  for (const log of doseLogs) {
    bump(localDateStr(log.scheduledDate), log.status);
  }

  // Aggregate totals
  let takenCount = 0;
  let missedCount = 0;
  let skippedCount = 0;
  let lateCount = 0;
  let unknownCount = 0;
  for (const e of byDate.values()) {
    takenCount += e.taken;
    missedCount += e.missed;
    skippedCount += e.skipped;
    lateCount += e.late;
    unknownCount += e.unknown;
  }
  const totalLogged = takenCount + missedCount + skippedCount + lateCount + unknownCount;
  const adherenceRate = totalLogged > 0
    ? Math.round(((takenCount + lateCount) / totalLogged) * 100)
    : 0;

  // Weekly trend: 4 weeks (oldest first).
  const weeklyTrend: Array<{ weekLabel: string; rate: number; logged: number }> = [];
  for (let w = 3; w >= 0; w--) {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartObj = localDateObj(weekStart);
    const weekEndObj = localDateObj(weekEnd);

    let wTaken = 0;
    let wTotal = 0;
    for (const [dateStr, e] of byDate.entries()) {
      const d = new Date(dateStr + "T00:00:00Z");
      if (d >= weekStartObj && d <= weekEndObj) {
        wTaken += e.taken + e.late;
        wTotal += e.total;
      }
    }
    const weekLabel = `${localDateStr(weekStart).slice(5)}–${localDateStr(weekEnd).slice(5)}`;
    weeklyTrend.push({
      weekLabel,
      rate: wTotal > 0 ? Math.round((wTaken / wTotal) * 100) : 0,
      logged: wTotal,
    });
  }

  // Last 7 days detail (oldest first)
  const last7Days: Array<{ date: string; status: "taken" | "missed" | "skipped" | "late" | "unknown" | "none" }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    const e = byDate.get(key);
    let status: "taken" | "missed" | "skipped" | "late" | "unknown" | "none" = "none";
    if (e) {
      if (e.taken > 0 && e.missed === 0 && e.unknown === 0) status = "taken";
      else if (e.missed > 0 && e.taken === 0) status = "missed";
      else if (e.unknown > 0 && e.taken === 0) status = "unknown";
      else if (e.late > 0 && e.missed === 0) status = "late";
      else if (e.skipped > 0 && e.taken === 0) status = "skipped";
      else status = e.taken > 0 ? "taken" : "unknown";
    }
    last7Days.push({ date: key, status });
  }

  // Current streak: how many consecutive days ending today have a "taken" status.
  let currentStreakDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = localDateStr(d);
    const e = byDate.get(key);
    if (e && (e.taken > 0 || e.late > 0) && e.missed === 0 && e.unknown === 0) {
      currentStreakDays += 1;
    } else if (i === 0) {
      // Today not logged yet — don't break the streak for previous days.
      continue;
    } else {
      break;
    }
  }

  return {
    customerId,
    windowDays,
    totalLogged,
    takenCount,
    missedCount,
    skippedCount,
    lateCount,
    unknownCount,
    adherenceRate,
    weeklyTrend,
    last7Days,
    currentStreakDays,
  };
}

/**
 * Get adherence stats per prescription for a customer (for the dashboard).
 */
export async function getAdherencePerPrescription(customerId: string, windowDays = 14) {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (windowDays - 1));
  const windowStartObj = localDateObj(windowStart);

  const prescriptions = await prisma.prescription.findMany({
    where: { customerId, status: "active" },
    select: {
      id: true,
      medicineName: true,
      dosage: true,
      adherence: {
        where: { takenOn: { gte: windowStartObj } },
        select: { status: true },
      },
      doseLogs: {
        where: { scheduledDate: { gte: windowStartObj } },
        select: { status: true },
      },
    },
    orderBy: { medicineName: "asc" },
  });

  return prescriptions.map((p) => {
    const all = [...p.adherence.map((a) => a.status), ...p.doseLogs.map((d) => d.status)];
    const taken = all.filter((s) => s === "taken" || s === "late").length;
    const rate = all.length > 0 ? Math.round((taken / all.length) * 100) : null;
    return {
      prescriptionId: p.id,
      medicineName: p.medicineName,
      dosage: p.dosage,
      loggedCount: all.length,
      adherenceRate: rate,
    };
  });
}

/**
 * Log a dose on behalf of a customer (by customer self, caregiver, or system).
 *
 * Writes BOTH a DoseLog (granular) and a PrescriptionAdherence (daily summary)
 * so the existing admin dashboard and AI context still work, while the new
 * schedule-aware features can read the granular DoseLog.
 *
 * If a scheduleId is provided, the DoseLog is keyed on (prescription, date, time).
 * If not, it's keyed on (prescription, date, null-time) for ad-hoc logging.
 */
export async function logDose(input: {
  customerId: string;
  prescriptionId: string;
  status: "taken" | "missed" | "skipped" | "late" | "unknown";
  scheduledDate?: Date; // defaults to today
  scheduledTime?: string | null; // "HH:mm" or null
  scheduleId?: string | null;
  notes?: string;
  recordedBy?: "customer" | "caregiver" | "system";
  caregiverId?: string;
}): Promise<{ doseLogId: string; adherenceId: string }> {
  const today = input.scheduledDate ?? localDateObj(new Date());
  const recordedBy = input.recordedBy ?? "customer";

  // 1. Upsert the granular DoseLog.
  const existingDose = input.scheduledTime
    ? await prisma.doseLog.findUnique({
        where: {
          prescriptionId_scheduledDate_scheduledTime: {
            prescriptionId: input.prescriptionId,
            scheduledDate: today,
            scheduledTime: input.scheduledTime,
          },
        },
      })
    : await prisma.doseLog.findFirst({
        where: {
          prescriptionId: input.prescriptionId,
          scheduledDate: today,
          scheduledTime: null,
        },
      });

  let doseLog;
  if (existingDose) {
    doseLog = await prisma.doseLog.update({
      where: { id: existingDose.id },
      data: {
        status: input.status,
        confirmedAt: input.status === "unknown" ? existingDose.confirmedAt : new Date(),
        recordedBy,
        caregiverId: input.caregiverId ?? existingDose.caregiverId ?? null,
        notes: input.notes ?? existingDose.notes,
      },
    });
  } else {
    doseLog = await prisma.doseLog.create({
      data: {
        prescriptionId: input.prescriptionId,
        customerId: input.customerId,
        scheduleId: input.scheduleId ?? null,
        scheduledDate: today,
        scheduledTime: input.scheduledTime ?? null,
        confirmedAt: input.status === "unknown" ? null : new Date(),
        status: input.status,
        recordedBy,
        caregiverId: input.caregiverId ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  // 2. Upsert the daily PrescriptionAdherence summary.
  //    If multiple doses per day exist, the daily status reflects the worst-case
  //    (any missed → missed, any unknown → unknown, else taken).
  const allDosesToday = await prisma.doseLog.findMany({
    where: { prescriptionId: input.prescriptionId, scheduledDate: today },
    select: { status: true },
  });
  const dailyStatus =
    allDosesToday.some((d) => d.status === "missed") ? "missed"
    : allDosesToday.some((d) => d.status === "unknown") ? "unknown"
    : allDosesToday.some((d) => d.status === "skipped") ? "skipped"
    : allDosesToday.some((d) => d.status === "late") ? "late"
    : "taken";

  const existingAdherence = await prisma.prescriptionAdherence.findUnique({
    where: {
      prescriptionId_takenOn: {
        prescriptionId: input.prescriptionId,
        takenOn: today,
      },
    },
  });

  let adherence;
  if (existingAdherence) {
    adherence = await prisma.prescriptionAdherence.update({
      where: { id: existingAdherence.id },
      data: {
        status: dailyStatus,
        notes: input.notes ?? existingAdherence.notes,
        recordedBy,
        caregiverId: input.caregiverId ?? existingAdherence.caregiverId ?? null,
      },
    });
  } else {
    adherence = await prisma.prescriptionAdherence.create({
      data: {
        prescriptionId: input.prescriptionId,
        customerId: input.customerId,
        takenOn: today,
        status: dailyStatus,
        notes: input.notes ?? null,
        recordedBy,
        caregiverId: input.caregiverId ?? null,
      },
    });
  }

  // 3. Clear related dose reminders so cron/escalation stop nagging.
  //    Portal UI often logs without a reminderId; this closes the loop either way.
  if (input.status !== "unknown") {
    await settleDoseReminders({
      customerId: input.customerId,
      prescriptionId: input.prescriptionId,
      scheduledDate: today,
      scheduledTime: input.scheduledTime ?? null,
    }).catch(() => {
      /* best-effort — never block the dose log */
    });
  }

  return { doseLogId: doseLog.id, adherenceId: adherence.id };
}

/**
 * Mark a dose reminder as "answered" once the patient/caregiver confirms it.
 * Used by the one-tap confirmation flow.
 */
export async function markReminderAnswered(reminderId: string): Promise<void> {
  await prisma.reminder.updateMany({
    where: { id: reminderId, status: { in: ["sent", "scheduled", "escalated"] } },
    data: { status: "answered" as const },
  });
}

/**
 * Settle all open medication_dose reminders for a prescription slot/day.
 * Matches by related prescription + local calendar day (±1 day buffer for TZ),
 * optionally narrowing to the scheduled time-of-day when known.
 */
export async function settleDoseReminders(opts: {
  customerId: string;
  prescriptionId: string;
  scheduledDate: Date;
  scheduledTime?: string | null;
}): Promise<number> {
  const dayStart = new Date(opts.scheduledDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  // Cover TZ edge cases: reminder.scheduledFor is absolute UTC, local day
  // may span two UTC dates. Use a generous 36h window around the local day.
  const windowStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000);

  const open = await prisma.reminder.findMany({
    where: {
      customerId: opts.customerId,
      type: "medication_dose",
      relatedId: opts.prescriptionId,
      status: { in: ["scheduled", "sent", "escalated"] },
      scheduledFor: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, scheduledFor: true, title: true },
  });

  if (open.length === 0) return 0;

  const time = opts.scheduledTime;
  const toAnswer = time
    ? open.filter((r) => {
        const hhmm = new Intl.DateTimeFormat("en-GB", {
          timeZone: PROJECT_TIMEZONE,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(r.scheduledFor);
        // Match exact slot, or title that embeds the time (snoozed reminders keep
        // original HH:mm in the title while scheduledFor moves — legacy
        // "Dose 08:00: …" or luxury "Evening · Med · 08:00").
        return hhmm === time || (r.title?.includes(time) ?? false);
      })
    : open;

  if (toAnswer.length === 0) return 0;

  const result = await prisma.reminder.updateMany({
    where: { id: { in: toAnswer.map((r) => r.id) } },
    data: { status: "answered" },
  });
  return result.count;
}
