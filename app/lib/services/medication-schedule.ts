import "server-only";

import { prisma } from "@/app/lib/db";
import { PROJECT_TIMEZONE } from "@/app/lib/time";
import {
  FREQUENCY_PRESETS,
  isSlotBeforeCourseStart as isSlotBeforeCourseStartShared,
  resolveStructuredSchedule,
  timeToMinutes,
  type FoodCondition,
  type ParsedDoseSlot,
  type StructuredScheduleInput,
} from "@/app/lib/medication-schedule-shared";
import { formatTime, localDateKey, localTodayStr } from "@/app/lib/time";

/**
 * Medication schedule generation.
 *
 * Parses a prescription's free-text dosage/schedule (e.g. "1 tablet twice daily after meals")
 * into structured time-of-day slots stored in the MedicationSchedule table.
 *
 * Slot generation rules:
 *   - "once daily" / "qd"               → ["08:00"]
 *   - "twice daily" / "bid" / "2x/day"  → ["08:00", "20:00"]
 *   - "three times daily" / "tid" / "3x/day" → ["08:00", "14:00", "20:00"]
 *   - "four times daily" / "qid" / "4x/day"  → ["08:00", "12:00", "16:00", "20:00"]
 *   - "every N hours"                   → N slots starting 08:00
 *   - "morning" / "evening" / "bedtime" → those slots
 *   - "with meals"                      → ["08:00", "13:00", "19:00"]
 *
 * If no frequency can be parsed, falls back to a single "08:00" slot.
 *
 * This is best-effort: pharmacists can always edit the schedule manually.
 * The schedule is regenerated only when explicitly requested (e.g. when the
 * prescription is created or its dosage changes), not on every save.
 */

export type { ParsedDoseSlot, FoodCondition, StructuredScheduleInput };
export { FREQUENCY_PRESETS, resolveStructuredSchedule };

export type DosageFormula = {
  unitsPerDose: number;
  dosesPerDay: number;
  dailyTotalUnits: number;
  formulaLabel: string;
  slots: ParsedDoseSlot[];
};

export type CalculatedCourseMetrics = {
  totalQuantity: number;
  unitsPerDose: number;
  dosesPerDay: number;
  dailyTotalUnits: number;
  formulaLabel: string;
  startDate: Date;
  expectedDosesToDate: number;
  takenDosesCount: number;
  missedDosesCount: number;
  skippedDosesCount: number;
  lateDosesCount: number;
  unitsTaken: number;
  unitsRemaining: number;
  daysRemaining: number;
  projectedRunOutDate: Date | null;
  adherenceRate: number; // 0-100% calculated strictly from expected vs actual
  complianceStatus: "excellent" | "good" | "warning" | "critical";
  overdueSlotsCount: number;
};

const FREQUENCY_PATTERNS: Array<{
  regex: RegExp;
  slots: ParsedDoseSlot[];
  dosesPerDay: number;
}> = [
  // Four times daily / QID
  {
    regex: /\b(four\s*times|4\s*times|qid|q\.?i\.?d\.?|4x\s*(?:\/|per|a)?\s*day)\b/i,
    dosesPerDay: 4,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "12:00", label: "Midday" },
      { timeOfDay: "16:00", label: "Afternoon" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  // Three times daily / TID
  {
    regex: /\b(three\s*times|3\s*times|tid|t\.?i\.?d\.?|3x\s*(?:\/|per|a)?\s*day)\b/i,
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "14:00", label: "Afternoon" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  // Twice daily / BID
  {
    regex: /\b(twice|two\s*times|2\s*times|bid|b\.?i\.?d\.?|2x\s*(?:\/|per|a)?\s*day)\b/i,
    dosesPerDay: 2,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  // Once daily / QD
  {
    regex: /\b(once|one\s*time|1\s*time|qd|q\.?d\.?|daily|1x\s*(?:\/|per|a)?\s*day|every\s*day)\b/i,
    dosesPerDay: 1,
    slots: [{ timeOfDay: "08:00", label: "Morning" }],
  },
  // With meals
  {
    regex: /\bwith\s*meals?\b/i,
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Breakfast" },
      { timeOfDay: "13:00", label: "Lunch" },
      { timeOfDay: "19:00", label: "Dinner" },
    ],
  },
];

const TIME_OF_DAY_PATTERNS: Array<{
  regex: RegExp;
  slot: ParsedDoseSlot;
}> = [
  { regex: /\bmorning\b|\bbreakfast\b|\bam\b/i, slot: { timeOfDay: "08:00", label: "Morning" } },
  { regex: /\bnoon\b|\bmidday\b|\blunch\b/i, slot: { timeOfDay: "12:00", label: "Midday" } },
  { regex: /\bafternoon\b/i, slot: { timeOfDay: "14:00", label: "Afternoon" } },
  { regex: /\bevening\b|\bdinner\b|\bsupper\b/i, slot: { timeOfDay: "19:00", label: "Evening" } },
  { regex: /\bbedtime\b|\blights?\s*out\b|\bnight\s*time\b|\bpm\b/i, slot: { timeOfDay: "21:00", label: "Bedtime" } },
];

const EVERY_N_HOURS = /every\s+(\d+)\s*hours?|q(\d+)h|q\.(\d+)\.h\./i;

/**
 * Parse a dosage formula string like "2 * 2" or "2 tablets twice daily" into structured numbers.
 */
export function parseDosageFormula(dosage: string | null | undefined, schedule: string | null | undefined): DosageFormula {
  const text = [dosage, schedule].filter(Boolean).join(" ");
  if (!text.trim()) {
    return {
      unitsPerDose: 1,
      dosesPerDay: 1,
      dailyTotalUnits: 1,
      formulaLabel: "1 unit × 1 dose/day = 1 unit/day",
      slots: [{ timeOfDay: "08:00", label: "Morning" }],
    };
  }

  let unitsPerDose = 1;
  let dosesPerDay = 1;

  const multiplyMatch = text.match(/\b(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\b/);
  if (multiplyMatch) {
    unitsPerDose = Math.max(1, parseFloat(multiplyMatch[1]));
    dosesPerDay = Math.max(1, parseFloat(multiplyMatch[2]));
  } else {
    const doseMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(?:tabs?|tablets?|pills?|caps?|capsules?|ml|sachet|units?|puffs?)\b/i);
    if (doseMatch) {
      unitsPerDose = Math.max(1, parseFloat(doseMatch[1]));
    }
  }

  let slots: ParsedDoseSlot[] = [];
  for (const pat of FREQUENCY_PATTERNS) {
    if (pat.regex.test(text)) {
      if (!multiplyMatch) dosesPerDay = pat.dosesPerDay;
      const timeHints = TIME_OF_DAY_PATTERNS.filter((t) => t.regex.test(text));
      slots = timeHints.length > 0 && timeHints.length === pat.slots.length ? timeHints.map((t) => t.slot) : pat.slots;
      break;
    }
  }

  if (slots.length === 0) {
    const everyHoursMatch = text.match(EVERY_N_HOURS);
    if (everyHoursMatch) {
      const n = parseInt(everyHoursMatch[1] || everyHoursMatch[2] || everyHoursMatch[3] || "8", 10);
      if (n > 0 && n <= 24) {
        for (let h = 8; h < 24; h += n) {
          slots.push({ timeOfDay: `${String(h).padStart(2, "0")}:00` });
        }
        if (!multiplyMatch) dosesPerDay = slots.length;
      }
    }
  }

  if (slots.length === 0) {
    const timeHints = TIME_OF_DAY_PATTERNS.filter((t) => t.regex.test(text));
    if (timeHints.length > 0) {
      slots = timeHints.map((t) => t.slot);
      if (!multiplyMatch) dosesPerDay = slots.length;
    }
  }

  if (slots.length === 0) {
    if (dosesPerDay === 1) slots = [{ timeOfDay: "08:00", label: "Morning" }];
    else if (dosesPerDay === 2) slots = [{ timeOfDay: "08:00", label: "Morning" }, { timeOfDay: "20:00", label: "Evening" }];
    else if (dosesPerDay === 3) slots = [{ timeOfDay: "08:00", label: "Morning" }, { timeOfDay: "14:00", label: "Afternoon" }, { timeOfDay: "20:00", label: "Evening" }];
    else if (dosesPerDay === 4) slots = [{ timeOfDay: "08:00", label: "Morning" }, { timeOfDay: "12:00", label: "Midday" }, { timeOfDay: "16:00", label: "Afternoon" }, { timeOfDay: "20:00", label: "Evening" }];
    else slots = [{ timeOfDay: "08:00", label: "Morning" }];
  }

  const dailyTotalUnits = unitsPerDose * dosesPerDay;
  const formulaLabel = `${unitsPerDose} ${unitsPerDose === 1 ? "unit" : "units"} × ${dosesPerDay} ${dosesPerDay === 1 ? "dose" : "doses"}/day (${dailyTotalUnits}/day)`;

  return { unitsPerDose, dosesPerDay, dailyTotalUnits, formulaLabel, slots };
}

export function parseScheduleFromText(text: string | null | undefined): ParsedDoseSlot[] {
  return parseDosageFormula(text, null).slots;
}

export function summarizeSchedule(slots: ParsedDoseSlot[]): string {
  return slots.map((s) => s.timeOfDay).join(", ");
}

export function calculatePrescriptionMetrics(
  rx: {
    startDate?: Date | null;
    createdAt: Date;
    dosage?: string | null;
    schedule?: string | null;
    quantity?: number | null;
  },
  doseLogs: Array<{ scheduledDate: Date; scheduledTime?: string | null; status: string }>,
  scheduleSlots?: ParsedDoseSlot[],
): CalculatedCourseMetrics {
  const formula = parseDosageFormula(rx.dosage, rx.schedule);
  const slots = scheduleSlots && scheduleSlots.length > 0 ? scheduleSlots : formula.slots;

  const totalQuantity = rx.quantity && rx.quantity > 0 ? rx.quantity : 30;
  const start = rx.startDate || rx.createdAt;

  const now = new Date();
  const nowStr = localTodayStr(now);
  const nowTime = formatTime(now);
  const startDateStr = localDateKey(start);

  let expectedDosesToDate = 0;
  let overdueSlotsCount = 0;

  const curr = new Date(startDateStr + "T00:00:00Z");
  const todayObj = new Date(nowStr + "T00:00:00Z");

  while (curr <= todayObj) {
    const dayStr = curr.toISOString().slice(0, 10);
    const isToday = curr.getTime() === todayObj.getTime();
    for (const slot of slots) {
      // Skip slots that were never due (before course start / mid-day creation).
      if (
        isSlotBeforeCourseStart({
          timeOfDay: slot.timeOfDay,
          startDate: rx.startDate,
          createdAt: rx.createdAt,
          dayStr,
        })
      ) {
        continue;
      }
      if (!isToday) {
        expectedDosesToDate += 1;
      } else if (slot.timeOfDay <= nowTime) {
        expectedDosesToDate += 1;
        const logged = doseLogs.find((d) => {
          const dStr = localDateKey(d.scheduledDate);
          return dStr === nowStr && (d.scheduledTime === slot.timeOfDay || !d.scheduledTime);
        });
        if (!logged || logged.status === "unknown") {
          overdueSlotsCount += 1;
        }
      }
    }
    curr.setDate(curr.getDate() + 1);
  }

  expectedDosesToDate = Math.max(0, expectedDosesToDate);

  const takenDosesCount = doseLogs.filter((d) => d.status === "taken" || d.status === "late").length;
  const lateDosesCount = doseLogs.filter((d) => d.status === "late").length;
  const missedDosesCount = doseLogs.filter((d) => d.status === "missed").length + overdueSlotsCount;
  const skippedDosesCount = doseLogs.filter((d) => d.status === "skipped").length;

  const unitsTaken = takenDosesCount * formula.unitsPerDose;
  const unitsRemaining = Math.max(0, totalQuantity - unitsTaken);
  const daysRemaining = Math.floor(unitsRemaining / Math.max(1, formula.dailyTotalUnits));

  const projectedRunOutDate = new Date(now.getTime() + daysRemaining * 86400000);
  // No expected doses yet (e.g. Rx created mid-day before first slot) → 100%.
  const adherenceRate =
    expectedDosesToDate <= 0
      ? 100
      : Math.min(100, Math.round((takenDosesCount / expectedDosesToDate) * 100));

  let complianceStatus: "excellent" | "good" | "warning" | "critical" = "excellent";
  if (adherenceRate >= 90) complianceStatus = "excellent";
  else if (adherenceRate >= 75) complianceStatus = "good";
  else if (adherenceRate >= 50) complianceStatus = "warning";
  else complianceStatus = "critical";

  return {
    totalQuantity,
    unitsPerDose: formula.unitsPerDose,
    dosesPerDay: formula.dosesPerDay,
    dailyTotalUnits: formula.dailyTotalUnits,
    formulaLabel: formula.formulaLabel,
    startDate: start,
    expectedDosesToDate,
    takenDosesCount,
    missedDosesCount,
    skippedDosesCount,
    lateDosesCount,
    unitsTaken,
    unitsRemaining,
    daysRemaining,
    projectedRunOutDate,
    adherenceRate,
    complianceStatus,
    overdueSlotsCount,
  };
}

/** Server wrapper: Date objects → local keys/clocks for shared start-day checks. */
function isSlotBeforeCourseStart(opts: {
  timeOfDay: string;
  startDate: Date | null | undefined;
  createdAt: Date;
  dayStr: string;
}): boolean {
  const start = opts.startDate || opts.createdAt;
  return isSlotBeforeCourseStartShared({
    timeOfDay: opts.timeOfDay,
    startDay: localDateKey(start),
    startClock: formatTime(start),
    createdDay: localDateKey(opts.createdAt),
    createdClock: formatTime(opts.createdAt),
    dayStr: opts.dayStr,
  });
}

export async function processAutoMissedDoses(customerId?: string): Promise<number> {
  const now = new Date();
  const todayStr = localTodayStr(now);
  const todayObj = new Date(todayStr + "T00:00:00Z");

  const graceTime = new Date(now.getTime() - 30 * 60 * 1000);
  const graceTimeStr = formatTime(graceTime);

  const schedules = await prisma.medicationSchedule.findMany({
    where: {
      active: true,
      ...(customerId ? { customerId } : {}),
      timeOfDay: { lte: graceTimeStr },
    },
    include: {
      prescription: {
        select: {
          id: true,
          customerId: true,
          medicineName: true,
          startDate: true,
          createdAt: true,
          status: true,
          endDate: true,
        },
      },
      doseLogs: {
        where: { scheduledDate: todayObj },
      },
    },
  });

  let autoMissedCount = 0;

  for (const sched of schedules) {
    const rx = sched.prescription;
    if (rx.status && rx.status !== "active") continue;
    if (rx.endDate && localDateKey(rx.endDate) < todayStr) continue;

    // Do not auto-miss doses that were never due on the start day (e.g. morning
    // slot when the Rx was created at 15:00), or before the course start date.
    if (
      isSlotBeforeCourseStart({
        timeOfDay: sched.timeOfDay,
        startDate: rx.startDate,
        createdAt: rx.createdAt,
        dayStr: todayStr,
      })
    ) {
      continue;
    }

    const existingLog = sched.doseLogs[0];

    if (!existingLog) {
      await prisma.doseLog.create({
        data: {
          prescriptionId: sched.prescriptionId,
          customerId: sched.customerId,
          scheduleId: sched.id,
          scheduledDate: todayObj,
          scheduledTime: sched.timeOfDay,
          status: "missed",
          recordedBy: "system",
          notes: `Auto-marked missed (unconfirmed past ${sched.timeOfDay})`,
        },
      });

      const existingAdherence = await prisma.prescriptionAdherence.findUnique({
        where: {
          prescriptionId_takenOn: {
            prescriptionId: sched.prescriptionId,
            takenOn: todayObj,
          },
        },
      });

      if (!existingAdherence) {
        await prisma.prescriptionAdherence.create({
          data: {
            prescriptionId: sched.prescriptionId,
            customerId: sched.customerId,
            takenOn: todayObj,
            status: "missed",
            recordedBy: "system",
            notes: "Auto-marked missed dose",
          },
        });
      }

      // Stop further push/escalation noise for this slot.
      await settleOpenDoseReminders(
        sched.customerId,
        sched.prescriptionId,
        todayObj,
        sched.timeOfDay,
      );
      autoMissedCount += 1;
    } else if (existingLog.status === "unknown") {
      await prisma.doseLog.update({
        where: { id: existingLog.id },
        data: {
          status: "missed",
          recordedBy: "system",
          notes: "Auto-marked missed after timeout",
        },
      });
      await settleOpenDoseReminders(
        sched.customerId,
        sched.prescriptionId,
        todayObj,
        sched.timeOfDay,
      );
      autoMissedCount += 1;
    }
  }

  return autoMissedCount;
}

/** Mark open dose reminders for a slot as answered (end of lifecycle). */
async function settleOpenDoseReminders(
  customerId: string,
  prescriptionId: string,
  scheduledDate: Date,
  timeOfDay: string,
): Promise<void> {
  const dayStart = new Date(scheduledDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const windowStart = new Date(dayStart.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(dayStart.getTime() + 36 * 60 * 60 * 1000);

  const open = await prisma.reminder.findMany({
    where: {
      customerId,
      type: "medication_dose",
      relatedId: prescriptionId,
      status: { in: ["scheduled", "sent", "escalated"] },
      scheduledFor: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, title: true, scheduledFor: true },
  });

  const ids = open
    .filter((r) => {
      if (r.title?.includes(timeOfDay)) return true;
      const hhmm = new Intl.DateTimeFormat("en-GB", {
        timeZone: PROJECT_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(r.scheduledFor);
      return hhmm === timeOfDay;
    })
    .map((r) => r.id);

  if (ids.length === 0) return;
  await prisma.reminder.updateMany({
    where: { id: { in: ids } },
    data: { status: "answered" },
  });
}

/**
 * Write structured slots straight to MedicationSchedule (no free-text parse round-trip).
 */
export async function applyStructuredSchedule(
  prescriptionId: string,
  input: StructuredScheduleInput,
): Promise<ParsedDoseSlot[]> {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, customerId: true, status: true },
  });
  if (!rx) throw new Error(`Prescription ${prescriptionId} not found`);

  const resolved = resolveStructuredSchedule(input);

  await prisma.$transaction([
    prisma.medicationSchedule.deleteMany({ where: { prescriptionId } }),
    ...resolved.slots.map((slot) =>
      prisma.medicationSchedule.create({
        data: {
          prescriptionId,
          customerId: rx.customerId,
          timeOfDay: slot.timeOfDay,
          doseQuantity: resolved.unitsPerDose,
          label: slot.label ?? null,
          active: rx.status === "active",
        },
      }),
    ),
    // Keep free-text schedule column in sync for display / legacy parsers.
    prisma.prescription.update({
      where: { id: prescriptionId },
      data: { schedule: resolved.scheduleText },
    }),
  ]);

  return resolved.slots;
}

export async function generateScheduleForPrescription(prescriptionId: string): Promise<ParsedDoseSlot[]> {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, customerId: true, dosage: true, schedule: true, status: true },
  });
  if (!rx) {
    throw new Error(`Prescription ${prescriptionId} not found`);
  }

  const formula = parseDosageFormula(rx.dosage, rx.schedule);

  await prisma.$transaction([
    prisma.medicationSchedule.deleteMany({ where: { prescriptionId } }),
    ...formula.slots.map((slot) =>
      prisma.medicationSchedule.create({
        data: {
          prescriptionId,
          customerId: rx.customerId,
          timeOfDay: slot.timeOfDay,
          doseQuantity: formula.unitsPerDose,
          label: slot.label ?? null,
          active: rx.status === "active",
        },
      }),
    ),
  ]);

  return formula.slots;
}

/**
 * Walk active MedicationSchedule rows and create today's medication_dose Reminder
 * rows ahead of each dose time. This is the missing link that feeds the
 * escalation cron (which already handles sent-but-unanswered dose reminders).
 *
 * Idempotent per (customer, prescription, schedule time, local day).
 */
export async function createDailyDoseReminders(opts?: {
  customerId?: string;
  /** Override "today" for tests — YYYY-MM-DD in project timezone. */
  dateStr?: string;
}): Promise<number> {
  const { parseLocalDatetimeInput } = await import("@/app/lib/time");

  const todayStr = opts?.dateStr ?? localTodayStr();

  const schedules = await prisma.medicationSchedule.findMany({
    where: {
      active: true,
      ...(opts?.customerId ? { customerId: opts.customerId } : {}),
      prescription: {
        status: "active",
        OR: [{ endDate: null }, { endDate: { gte: new Date(todayStr + "T00:00:00Z") } }],
      },
    },
    include: {
      prescription: {
        select: {
          id: true,
          medicineName: true,
          dosage: true,
          customerId: true,
          startDate: true,
          createdAt: true,
          customer: {
            select: {
              preferences: { select: { reminderConsent: true } },
            },
          },
        },
      },
    },
    take: 500,
  });

  let created = 0;

  for (const sched of schedules) {
    const rx = sched.prescription;
    if (rx.customer?.preferences?.reminderConsent === false) continue;

    // Don't schedule before the course start date, and on the start day skip
    // slots earlier than the effective start wall-clock (creation mid-day).
    if (
      isSlotBeforeCourseStart({
        timeOfDay: sched.timeOfDay,
        startDate: rx.startDate,
        createdAt: rx.createdAt,
        dayStr: todayStr,
      })
    ) {
      continue;
    }

    const scheduledFor = parseLocalDatetimeInput(`${todayStr}T${sched.timeOfDay}`);
    const todayObj = new Date(todayStr + "T00:00:00Z");

    // Idempotency: match the local calendar day around this slot.
    // Window is asymmetric around midnight so evening→morning cycles don't
    // collide with the previous/next day's same clock time as aggressively.
    const slotMins = timeToMinutes(sched.timeOfDay) ?? 0;
    // Wider before noon-ish slots (catch previous evening snoozes less), tighter overnight.
    const preHours = slotMins < 6 * 60 ? 8 : 14;
    const postHours = slotMins >= 18 * 60 ? 8 : 14;
    const dayWindowStart = new Date(scheduledFor.getTime() - preHours * 60 * 60 * 1000);
    const dayWindowEnd = new Date(scheduledFor.getTime() + postHours * 60 * 60 * 1000);
    const existingReminders = await prisma.reminder.findMany({
      where: {
        customerId: rx.customerId,
        type: "medication_dose",
        relatedId: rx.id,
        scheduledFor: { gte: dayWindowStart, lte: dayWindowEnd },
      },
      select: { id: true, title: true, scheduledFor: true, status: true },
    });
    const alreadyHasSlot = existingReminders.some((r) => {
      if (r.title?.includes(sched.timeOfDay)) return true;
      if (sched.label && r.title?.toLowerCase().includes(sched.label.toLowerCase())) {
        const hhmm = formatTime(r.scheduledFor);
        const remMins = timeToMinutes(hhmm) ?? -999;
        return Math.abs(slotMins - remMins) <= 5;
      }
      const hhmm = formatTime(r.scheduledFor);
      const remMins = timeToMinutes(hhmm) ?? -999;
      return Math.abs(slotMins - remMins) <= 5;
    });
    if (alreadyHasSlot) continue;

    // Skip if the dose is already resolved for today (any definitive status).
    const logged = await prisma.doseLog.findUnique({
      where: {
        prescriptionId_scheduledDate_scheduledTime: {
          prescriptionId: rx.id,
          scheduledDate: todayObj,
          scheduledTime: sched.timeOfDay,
        },
      },
      select: { status: true },
    }).catch(() => null);
    if (
      logged &&
      (logged.status === "taken" ||
        logged.status === "late" ||
        logged.status === "skipped" ||
        logged.status === "missed")
    ) {
      continue;
    }

    const label = sched.label?.trim() || null;
    const doseQty = Number(sched.doseQuantity) || 1;
    // Concise luxury copy — action buttons carry the CTA; body stays short.
    // Keep HH:mm in the title so snooze / settle logic can recover the original slot.
    const body =
      rx.dosage?.trim() ||
      (doseQty !== 1 ? `Take ${doseQty}` : "Your scheduled dose");

    // "Evening · Amoxicillin · 20:00" (legacy parsers also accept "Dose 20:00: …").
    const title = label
      ? `${label} · ${rx.medicineName} · ${sched.timeOfDay}`
      : `${rx.medicineName} · ${sched.timeOfDay}`;

    await prisma.reminder.create({
      data: {
        customerId: rx.customerId,
        type: "medication_dose",
        title,
        body,
        channel: "push",
        scheduledFor,
        relatedType: "prescription",
        relatedId: rx.id,
        createdById: null,
      },
    });

    created += 1;
  }

  return created;
}

export async function getScheduleForPrescription(prescriptionId: string) {
  const rows = await prisma.medicationSchedule.findMany({
    where: { prescriptionId, active: true },
    orderBy: { timeOfDay: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    timeOfDay: r.timeOfDay,
    label: r.label,
    doseQuantity: Number(r.doseQuantity),
  }));
}

export async function getTodaysDosesForCustomer(customerId: string) {
  await processAutoMissedDoses(customerId).catch(() => 0);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const today = new Date(todayStr + "T00:00:00Z");

  const schedules = await prisma.medicationSchedule.findMany({
    where: { customerId, active: true },
    include: {
      prescription: {
        select: { id: true, medicineName: true, dosage: true, schedule: true, status: true, quantity: true },
      },
      doseLogs: {
        where: { scheduledDate: today },
        take: 1,
      },
    },
    orderBy: { timeOfDay: "asc" },
  });

  return schedules.map((s) => ({
    scheduleId: s.id,
    prescriptionId: s.prescriptionId,
    medicineName: s.prescription.medicineName,
    dosage: s.prescription.dosage,
    timeOfDay: s.timeOfDay,
    label: s.label,
    doseLog: s.doseLogs[0] ?? null,
  }));
}

export async function getUpcomingDosesForCustomer(customerId: string, limit = 5) {
  const doses = await getTodaysDosesForCustomer(customerId);
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PROJECT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = nowParts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = nowParts.find((p) => p.type === "minute")?.value ?? "00";
  const nowStr = `${hh}:${mm}`;

  const upcoming = doses
    .filter((d) => !d.doseLog || d.doseLog.status === "unknown")
    .filter((d) => d.timeOfDay >= nowStr)
    .slice(0, limit);

  if (upcoming.length >= limit) return upcoming;

  const overdue = doses
    .filter((d) => !d.doseLog || d.doseLog.status === "missed")
    .filter((d) => d.timeOfDay < nowStr)
    .slice(0, limit - upcoming.length);

  return [...overdue, ...upcoming];
}
