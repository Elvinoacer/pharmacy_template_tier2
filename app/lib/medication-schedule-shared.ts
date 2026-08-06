/**
 * Client-safe schedule helpers (no DB / server-only imports).
 * Shared by PrescriptionForm (client) and medication-schedule service (server).
 */

export type ParsedDoseSlot = {
  timeOfDay: string; // "HH:mm"
  label?: string;
};

export type FoodCondition = "none" | "with_food" | "without_food";

export const FREQUENCY_PRESETS: Record<
  string,
  { label: string; dosesPerDay: number; slots: ParsedDoseSlot[] }
> = {
  qd: {
    label: "Once daily (QD)",
    dosesPerDay: 1,
    slots: [{ timeOfDay: "08:00", label: "Morning" }],
  },
  bid: {
    label: "Twice daily (BID)",
    dosesPerDay: 2,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  tid: {
    label: "Three times daily (TID)",
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "14:00", label: "Afternoon" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  qid: {
    label: "Four times daily (QID)",
    dosesPerDay: 4,
    slots: [
      { timeOfDay: "08:00", label: "Morning" },
      { timeOfDay: "12:00", label: "Midday" },
      { timeOfDay: "16:00", label: "Afternoon" },
      { timeOfDay: "20:00", label: "Evening" },
    ],
  },
  with_meals: {
    label: "With meals",
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Breakfast" },
      { timeOfDay: "13:00", label: "Lunch" },
      { timeOfDay: "19:00", label: "Dinner" },
    ],
  },
  custom: {
    label: "Custom times",
    dosesPerDay: 1,
    slots: [{ timeOfDay: "08:00", label: "Custom" }],
  },
};

export type StructuredScheduleInput = {
  frequency: keyof typeof FREQUENCY_PRESETS | string;
  times?: string[];
  labels?: string[];
  foodCondition?: FoodCondition;
  unitsPerDose?: number;
};

/**
 * Resolve structured form input into concrete dose slots + a human-readable schedule line.
 */
export function resolveStructuredSchedule(input: StructuredScheduleInput): {
  slots: ParsedDoseSlot[];
  scheduleText: string;
  unitsPerDose: number;
  dosesPerDay: number;
} {
  const unitsPerDose = Math.max(0.25, Number(input.unitsPerDose) || 1);
  const preset = FREQUENCY_PRESETS[input.frequency] ?? FREQUENCY_PRESETS.custom;

  let slots: ParsedDoseSlot[];
  if (input.times && input.times.length > 0) {
    slots = input.times
      .map((t) => t.trim())
      .filter((t) => /^\d{2}:\d{2}$/.test(t))
      .map((timeOfDay, i) => ({
        timeOfDay,
        label: input.labels?.[i] || preset.slots[i]?.label || undefined,
      }));
  } else {
    slots = preset.slots.map((s) => ({ ...s }));
  }

  if (slots.length === 0) {
    slots = [{ timeOfDay: "08:00", label: "Morning" }];
  }

  const seen = new Set<string>();
  slots = slots.filter((s) => {
    if (seen.has(s.timeOfDay)) return false;
    seen.add(s.timeOfDay);
    return true;
  });

  const food =
    input.foodCondition === "with_food"
      ? "with food"
      : input.foodCondition === "without_food"
        ? "without food"
        : null;

  const timePart = slots.map((s) => (s.label ? `${s.timeOfDay} (${s.label})` : s.timeOfDay)).join(", ");
  const dosePart =
    unitsPerDose === 1
      ? `${slots.length}×/day`
      : `${unitsPerDose} unit${unitsPerDose === 1 ? "" : "s"} × ${slots.length}/day`;
  const scheduleText = [dosePart, `at ${timePart}`, food].filter(Boolean).join(" · ");

  return {
    slots,
    scheduleText,
    unitsPerDose,
    dosesPerDay: slots.length,
  };
}
