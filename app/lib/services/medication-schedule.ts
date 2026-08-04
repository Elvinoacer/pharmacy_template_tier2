import "server-only";

import { prisma } from "@/app/lib/db";
import { PROJECT_TIMEZONE } from "@/app/lib/time";

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

export type ParsedDoseSlot = {
  timeOfDay: string; // "HH:mm"
  label?: string;
};

const FREQUENCY_PATTERNS: Array<{
  regex: RegExp;
  slots: ParsedDoseSlot[];
}> = [
  // Four times daily / QID
  {
    regex: /\b(four\s*times|4\s*times|qid|q\.?i\.?d\.?|4x\s*(?:\/|per|a)?\s*day)\b/i,
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
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "14:00", label: "Afternoon" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  // Twice daily / BID
  {
    regex: /\b(twice|two\s*times|2\s*times|bid|b\.?i\.?d\.?|2x\s*(?:\/|per|a)?\s*day)\b/i,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  // Once daily / QD
  {
    regex: /\b(once|one\s*time|1\s*time|qd|q\.?d\.?|daily|1x\s*(?:\/|per|a)?\s*day|every\s*day)\b/i,
    slots: [{ timeOfDay: "08:00", label: "Morning" }],
  },
  // With meals
  {
    regex: /\bwith\s*meals?\b/i,
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
 * Parse a free-text dosage/schedule string into structured dose slots.
 * Pure function — does not touch the DB.
 */
export function parseScheduleFromText(
  text: string | null | undefined,
): ParsedDoseSlot[] {
  if (!text || !text.trim()) {
    return [{ timeOfDay: "08:00", label: "Morning" }];
  }

  // 1. Try frequency patterns first.
  for (const pat of FREQUENCY_PATTERNS) {
    if (pat.regex.test(text)) {
      // But also check for time-of-day hints to override defaults.
      const timeHints = TIME_OF_DAY_PATTERNS.filter((t) => t.regex.test(text));
      if (timeHints.length > 0 && timeHints.length === pat.slots.length) {
        return timeHints.map((t) => t.slot);
      }
      return pat.slots;
    }
  }

  // 2. Try "every N hours".
  const everyHoursMatch = text.match(EVERY_N_HOURS);
  if (everyHoursMatch) {
    const n = parseInt(everyHoursMatch[1] || everyHoursMatch[2] || everyHoursMatch[3] || "8", 10);
    if (n > 0 && n <= 24) {
      const slots: ParsedDoseSlot[] = [];
      for (let h = 8; h < 24; h += n) {
        slots.push({ timeOfDay: `${String(h).padStart(2, "0")}:00` });
      }
      if (slots.length > 0) return slots;
    }
  }

  // 3. Look for explicit time-of-day words.
  const timeHints = TIME_OF_DAY_PATTERNS.filter((t) => t.regex.test(text));
  if (timeHints.length > 0) {
    return timeHints.map((t) => t.slot);
  }

  // 4. Look for explicit HH:mm times.
  const timeMatches = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g);
  if (timeMatches && timeMatches.length > 0) {
    const seen = new Set<string>();
    const slots: ParsedDoseSlot[] = [];
    for (const raw of timeMatches) {
      const [h, m] = raw.split(":");
      const hh = h.padStart(2, "0");
      const mm = m.padStart(2, "0");
      const timeOfDay = `${hh}:${mm}`;
      if (!seen.has(timeOfDay)) {
        seen.add(timeOfDay);
        slots.push({ timeOfDay });
      }
    }
    if (slots.length > 0) return slots;
  }

  // 5. Fallback: once daily at 08:00.
  return [{ timeOfDay: "08:00", label: "Morning" }];
}

/**
 * Build a human-readable summary of the schedule (e.g. "08:00, 20:00").
 */
export function summarizeSchedule(slots: ParsedDoseSlot[]): string {
  return slots.map((s) => s.timeOfDay).join(", ");
}

/**
 * Generate (or regenerate) the MedicationSchedule rows for a prescription.
 * Idempotent: deletes existing rows then re-creates them based on the current
 * dosage/schedule text. Returns the new slots.
 *
 * Call this when:
 *   - A prescription is created (admin)
 *   - A prescription's dosage/schedule is edited
 *   - Admin clicks "Regenerate schedule" on the prescription detail page
 */
export async function generateScheduleForPrescription(prescriptionId: string): Promise<ParsedDoseSlot[]> {
  const rx = await prisma.prescription.findUnique({
    where: { id: prescriptionId },
    select: { id: true, customerId: true, dosage: true, schedule: true, status: true },
  });
  if (!rx) {
    throw new Error(`Prescription ${prescriptionId} not found`);
  }

  // Combine dosage + schedule text for parsing.
  const combinedText = [rx.dosage, rx.schedule].filter(Boolean).join(" ");
  const slots = parseScheduleFromText(combinedText);

  // Replace existing schedule rows in a single transaction.
  await prisma.$transaction([
    prisma.medicationSchedule.deleteMany({ where: { prescriptionId } }),
    ...slots.map((slot) =>
      prisma.medicationSchedule.create({
        data: {
          prescriptionId,
          customerId: rx.customerId,
          timeOfDay: slot.timeOfDay,
          label: slot.label ?? null,
          active: rx.status === "active",
        },
      }),
    ),
  ]);

  return slots;
}

/**
 * Get the schedule for a prescription (returns parsed slots from DB).
 */
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

/**
 * For a given customer, get all scheduled doses for "today" (in project timezone),
 * joined with their DoseLog entry if one exists for today.
 *
 * Used by the caregiver dashboard and the patient portal to render the
 * "today's doses" checklist.
 */
export async function getTodaysDosesForCustomer(customerId: string) {
  // Local YYYY-MM-DD in project timezone.
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
        select: { id: true, medicineName: true, dosage: true, status: true },
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

/**
 * Get the next N upcoming scheduled doses for a customer (across all active prescriptions).
 * Returns slots whose scheduled time today is in the future, plus tomorrow's first slot if needed.
 */
export async function getUpcomingDosesForCustomer(customerId: string, limit = 5) {
  const doses = await getTodaysDosesForCustomer(customerId);
  // Get current time in project timezone as "HH:mm".
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PROJECT_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = nowParts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = nowParts.find((p) => p.type === "minute")?.value ?? "00";
  const nowStr = `${hh}:${mm}`;

  // Prioritise: unconfirmed doses whose time has passed → upcoming doses.
  const upcoming = doses
    .filter((d) => !d.doseLog || d.doseLog.status === "unknown")
    .filter((d) => d.timeOfDay >= nowStr)
    .slice(0, limit);

  if (upcoming.length >= limit) return upcoming;

  // Fill with overdue unconfirmed doses.
  const overdue = doses
    .filter((d) => !d.doseLog)
    .filter((d) => d.timeOfDay < nowStr)
    .slice(0, limit - upcoming.length);

  return [...overdue, ...upcoming];
}
