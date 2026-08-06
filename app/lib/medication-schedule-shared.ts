/**
 * Client-safe schedule helpers (no DB / server-only imports).
 * Shared by PrescriptionForm (client) and medication-schedule service (server).
 */

export type ParsedDoseSlot = {
  timeOfDay: string; // "HH:mm"
  label?: string;
  /**
   * Day offset relative to the first dose in the entry cycle (0 = same calendar day).
   * Populated when times wrap past midnight in entry order (e.g. 20:00 then 08:00).
   * Daily rows still key on timeOfDay; dayOffset is used for schedule text / warnings
   * and first-day start logic before persistence normalises to clock times.
   */
  dayOffset?: number;
};

export type FoodCondition = "none" | "with_food" | "without_food";

export const FREQUENCY_PRESETS: Record<
  string,
  { label: string; dosesPerDay: number; slots: ParsedDoseSlot[] }
> = {
  qd: {
    label: "Once daily (QD)",
    dosesPerDay: 1,
    slots: [{ timeOfDay: "08:00", label: "Morning", dayOffset: 0 }],
  },
  bid: {
    label: "Twice daily (BID)",
    dosesPerDay: 2,
    slots: [
      { timeOfDay: "08:00", label: "Morning", dayOffset: 0 },
      { timeOfDay: "20:00", label: "Evening", dayOffset: 0 },
    ],
  },
  tid: {
    label: "Three times daily (TID)",
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Morning", dayOffset: 0 },
      { timeOfDay: "14:00", label: "Afternoon", dayOffset: 0 },
      { timeOfDay: "20:00", label: "Evening", dayOffset: 0 },
    ],
  },
  qid: {
    label: "Four times daily (QID)",
    dosesPerDay: 4,
    slots: [
      { timeOfDay: "08:00", label: "Morning", dayOffset: 0 },
      { timeOfDay: "12:00", label: "Midday", dayOffset: 0 },
      { timeOfDay: "16:00", label: "Afternoon", dayOffset: 0 },
      { timeOfDay: "20:00", label: "Evening", dayOffset: 0 },
    ],
  },
  with_meals: {
    label: "With meals",
    dosesPerDay: 3,
    slots: [
      { timeOfDay: "08:00", label: "Breakfast", dayOffset: 0 },
      { timeOfDay: "13:00", label: "Lunch", dayOffset: 0 },
      { timeOfDay: "19:00", label: "Dinner", dayOffset: 0 },
    ],
  },
  custom: {
    label: "Custom times",
    dosesPerDay: 1,
    slots: [{ timeOfDay: "08:00", label: "Custom", dayOffset: 0 }],
  },
};

export type StructuredScheduleInput = {
  frequency: keyof typeof FREQUENCY_PRESETS | string;
  times?: string[];
  labels?: string[];
  foodCondition?: FoodCondition;
  unitsPerDose?: number;
  /**
   * When true, keep entry order across midnight (20:00 → 08:00 next day) with
   * dayOffset. Default false: sort to the same calendar day (matches how
   * MedicationSchedule stores one row per clock time every day).
   */
  preserveCrossMidnightOrder?: boolean;
};

export type ResolvedStructuredSchedule = {
  slots: ParsedDoseSlot[];
  scheduleText: string;
  unitsPerDose: number;
  dosesPerDay: number;
  /** True when entry order crossed midnight (e.g. 20:00 → 08:00). */
  crossesMidnight: boolean;
  /** Human-readable warning for admins, or null when schedule is fine. */
  warning: string | null;
  /**
   * First dose clock time in the cycle the admin entered (before same-day sort).
   * Used on the course start day so earlier same-day slots are not treated as due.
   */
  cycleAnchorTime: string | null;
};

const HHMM_RE = /^\d{2}:\d{2}$/;

/** Minutes since local midnight for an HH:mm string, or null if invalid. */
export function timeToMinutes(hhmm: string): number | null {
  if (!HHMM_RE.test(hhmm)) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

/** Compare two HH:mm strings. Negative if a < b. */
export function compareTimes(a: string, b: string): number {
  return (timeToMinutes(a) ?? 0) - (timeToMinutes(b) ?? 0);
}

/** Infer a friendly dose label from clock time when none was provided. */
export function inferLabelFromTime(timeOfDay: string, index = 0): string {
  const mins = timeToMinutes(timeOfDay);
  if (mins == null) return `Dose ${index + 1}`;
  if (mins < 5 * 60) return "Night"; // 00:00–04:59
  if (mins < 11 * 60) return "Morning"; // 05:00–10:59
  if (mins < 14 * 60) return "Midday"; // 11:00–13:59
  if (mins < 17 * 60) return "Afternoon"; // 14:00–16:59
  if (mins < 21 * 60) return "Evening"; // 17:00–20:59
  return "Bedtime"; // 21:00–23:59
}

/**
 * Detect whether a sequence of HH:mm times wraps past midnight in the order
 * the admin entered them (non-ascending clock order).
 *
 * Example: ["20:00", "08:00"] → crosses midnight
 * Example: ["08:00", "20:00"] → same calendar day
 */
export function detectCrossesMidnight(times: string[]): boolean {
  const mins = times.map(timeToMinutes).filter((m): m is number => m != null);
  if (mins.length < 2) return false;
  for (let i = 1; i < mins.length; i++) {
    if (mins[i] <= mins[i - 1]) return true;
  }
  return false;
}

/**
 * Hours from the last dose back around to the first (the overnight gap).
 * E.g. 20:00 → 08:00 is 12 hours.
 */
export function overnightGapHours(times: string[]): number | null {
  const valid = times.map(timeToMinutes).filter((m): m is number => m != null);
  if (valid.length < 2) return null;
  const last = valid[valid.length - 1];
  const first = valid[0];
  // Gap going forward from last to first next day.
  const gap = (first + 24 * 60 - last) % (24 * 60);
  return Math.round((gap / 60) * 10) / 10;
}

type RawSlot = { timeOfDay: string; label?: string; index: number };

function dedupeRawSlots(raw: RawSlot[]): RawSlot[] {
  const seen = new Set<string>();
  return raw.filter((s) => {
    if (seen.has(s.timeOfDay)) return false;
    seen.add(s.timeOfDay);
    return true;
  });
}

/**
 * Normalize raw times + labels into dose slots.
 *
 * - Dedupes identical HH:mm values
 * - By default sorts chronologically on the same calendar day (labels stay glued
 *   to each clock time — fixing "Dose 20:00" losing its Evening label)
 * - When preserveCrossMidnightOrder is set, keeps cycle order with dayOffset
 */
export function normalizeDoseSlots(
  times: string[],
  labels?: (string | undefined | null)[],
  opts?: { preserveCrossMidnightOrder?: boolean },
): {
  slots: ParsedDoseSlot[];
  crossesMidnight: boolean;
  cycleAnchorTime: string | null;
  wasReordered: boolean;
} {
  const preserve = opts?.preserveCrossMidnightOrder === true;

  const raw = times
    .map((t, i) => ({
      timeOfDay: String(t || "").trim(),
      label: labels?.[i]?.trim() || undefined,
      index: i,
    }))
    .filter((s) => HHMM_RE.test(s.timeOfDay) && timeToMinutes(s.timeOfDay) != null);

  if (raw.length === 0) {
    return { slots: [], crossesMidnight: false, cycleAnchorTime: null, wasReordered: false };
  }

  const unique = dedupeRawSlots(raw);
  const orderedTimes = unique.map((s) => s.timeOfDay);
  const crossesMidnight = detectCrossesMidnight(orderedTimes);
  const cycleAnchorTime = unique[0]?.timeOfDay ?? null;

  let slots: ParsedDoseSlot[];
  let wasReordered = false;

  if (crossesMidnight && preserve) {
    let dayOffset = 0;
    let prevMins = timeToMinutes(unique[0].timeOfDay) ?? 0;
    slots = unique.map((s, i) => {
      const mins = timeToMinutes(s.timeOfDay) ?? 0;
      if (i > 0 && mins <= prevMins) dayOffset += 1;
      prevMins = mins;
      return {
        timeOfDay: s.timeOfDay,
        label: s.label || inferLabelFromTime(s.timeOfDay, i),
        dayOffset,
      };
    });
  } else {
    const sorted = [...unique].sort(
      (a, b) => (timeToMinutes(a.timeOfDay) ?? 0) - (timeToMinutes(b.timeOfDay) ?? 0),
    );
    wasReordered =
      sorted.length !== unique.length ||
      sorted.some((s, i) => s.timeOfDay !== unique[i].timeOfDay);
    slots = sorted.map((s, i) => ({
      timeOfDay: s.timeOfDay,
      label: s.label || inferLabelFromTime(s.timeOfDay, i),
      dayOffset: 0,
    }));
  }

  return { slots, crossesMidnight, cycleAnchorTime, wasReordered };
}

function formatSlotForScheduleText(slot: ParsedDoseSlot): string {
  const dayHint =
    slot.dayOffset && slot.dayOffset > 0
      ? slot.dayOffset === 1
        ? "next day"
        : `+${slot.dayOffset}d`
      : null;
  const parts = [
    slot.timeOfDay,
    slot.label ? `(${slot.label})` : null,
    dayHint ? `[${dayHint}]` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

/**
 * Resolve structured form input into concrete dose slots + a human-readable schedule line.
 *
 * Handles the AM/PM day-boundary case:
 * - Detects when admin enters 20:00 then 08:00 (wraps past midnight)
 * - By default sorts to same-calendar-day order with labels kept on each time
 * - Surfaces a warning so the form can show the overnight gap clearly
 * - Returns cycleAnchorTime for first-day "don't mark earlier slots missed" logic
 */
export function resolveStructuredSchedule(input: StructuredScheduleInput): ResolvedStructuredSchedule {
  const unitsPerDose = Math.max(0.25, Number(input.unitsPerDose) || 1);
  const preset = FREQUENCY_PRESETS[input.frequency] ?? FREQUENCY_PRESETS.custom;

  let slots: ParsedDoseSlot[];
  let crossesMidnight = false;
  let cycleAnchorTime: string | null = null;
  let wasReordered = false;

  if (input.times && input.times.length > 0) {
    // Prefer explicit labels from the form; fall back to preset labels by matching
    // clock time (so BID "Evening" survives reordering). Index-based preset labels
    // only apply when the slot count matches the preset — never force the single
    // "Custom" label onto every custom time.
    const useIndexLabels =
      input.frequency !== "custom" &&
      preset.slots.length === input.times.length;
    const labels = input.times.map((time, i) => {
      const explicit = input.labels?.[i]?.trim();
      if (explicit) return explicit;
      const byTime = preset.slots.find((s) => s.timeOfDay === time);
      if (byTime?.label) return byTime.label;
      if (useIndexLabels) return preset.slots[i]?.label;
      return undefined; // infer from clock in normalizeDoseSlots
    });
    const normalized = normalizeDoseSlots(input.times, labels, {
      preserveCrossMidnightOrder: input.preserveCrossMidnightOrder,
    });
    slots = normalized.slots;
    crossesMidnight = normalized.crossesMidnight;
    cycleAnchorTime = normalized.cycleAnchorTime;
    wasReordered = normalized.wasReordered;
  } else {
    slots = preset.slots.map((s) => ({
      timeOfDay: s.timeOfDay,
      label: s.label,
      dayOffset: s.dayOffset ?? 0,
    }));
    cycleAnchorTime = slots[0]?.timeOfDay ?? null;
  }

  if (slots.length === 0) {
    slots = [{ timeOfDay: "08:00", label: "Morning", dayOffset: 0 }];
    cycleAnchorTime = "08:00";
  }

  // Ensure every slot has a label (custom times used to fall back to bare HH:mm).
  slots = slots.map((s, i) => ({
    ...s,
    label: s.label?.trim() || inferLabelFromTime(s.timeOfDay, i),
    dayOffset: s.dayOffset ?? 0,
  }));

  const food =
    input.foodCondition === "with_food"
      ? "with food"
      : input.foodCondition === "without_food"
        ? "without food"
        : null;

  const timePart = slots.map(formatSlotForScheduleText).join(", ");
  const dosePart =
    unitsPerDose === 1
      ? `${slots.length}×/day`
      : `${unitsPerDose} unit${unitsPerDose === 1 ? "" : "s"} × ${slots.length}/day`;
  const scheduleText = [dosePart, `at ${timePart}`, food].filter(Boolean).join(" · ");

  let warning: string | null = null;
  if (crossesMidnight) {
    const gap = overnightGapHours(
      input.times?.filter((t) => HHMM_RE.test(String(t || "").trim())) ??
        slots.map((s) => s.timeOfDay),
    );
    const gapText = gap != null ? ` (≈${gap}h overnight from last → first)` : "";
    if (input.preserveCrossMidnightOrder) {
      const nextDay = slots.filter((s) => (s.dayOffset ?? 0) > 0);
      warning =
        `Times cross midnight${gapText}: cycle starts at ${cycleAnchorTime}` +
        (nextDay.length
          ? `, then ${nextDay.map((s) => `${s.timeOfDay} next day`).join(", ")}`
          : "") +
        `. First calendar day only includes doses from the cycle start time onward.`;
    } else {
      warning =
        `Times were entered out of clock order${gapText}. ` +
        `Sorted to same-day order: ${slots.map((s) => `${s.timeOfDay} (${s.label})`).join(", ")}. ` +
        `Each time repeats every calendar day; doses before the course start time on day one are skipped.`;
    }
  } else if (wasReordered) {
    warning = `Dose times sorted chronologically: ${slots.map((s) => s.timeOfDay).join(", ")}.`;
  }

  return {
    slots,
    scheduleText,
    unitsPerDose,
    dosesPerDay: slots.length,
    crossesMidnight,
    warning,
    cycleAnchorTime,
  };
}

/**
 * Sort HH:mm times ascending for same-day display, keeping parallel labels
 * attached to each time.
 */
export function sortTimesWithLabels(
  times: string[],
  labels?: (string | undefined | null)[],
): { times: string[]; labels: string[] } {
  const paired = times
    .map((t, i) => ({
      time: String(t || "").trim(),
      label: labels?.[i]?.trim() || inferLabelFromTime(String(t || "").trim(), i),
    }))
    .filter((p) => HHMM_RE.test(p.time));

  paired.sort((a, b) => (timeToMinutes(a.time) ?? 0) - (timeToMinutes(b.time) ?? 0));

  const seen = new Set<string>();
  const out = paired.filter((p) => {
    if (seen.has(p.time)) return false;
    seen.add(p.time);
    return true;
  });

  return {
    times: out.map((p) => p.time),
    labels: out.map((p) => p.label),
  };
}

/** Labels for a frequency preset's default slots. */
export function presetLabels(frequency: string): string[] {
  const preset = FREQUENCY_PRESETS[frequency];
  return preset ? preset.slots.map((s) => s.label || inferLabelFromTime(s.timeOfDay)) : ["Custom"];
}

/** Default times for a frequency preset. */
export function presetTimes(frequency: string): string[] {
  const preset = FREQUENCY_PRESETS[frequency];
  return preset ? preset.slots.map((s) => s.timeOfDay) : ["08:00"];
}

/**
 * On the course start calendar day, doses strictly before this HH:mm are not due.
 * Pass pre-formatted local date keys (YYYY-MM-DD) and HH:mm clocks.
 *
 * Returns null when the day is after the start day (all slots eligible),
 * or when the whole day is before start (caller should treat as not started).
 */
export function effectiveStartTimeOnDay(opts: {
  startDay: string;
  startClock: string;
  createdDay: string;
  createdClock: string;
  dayStr: string;
}): string | null {
  if (!opts.startDay || opts.startDay > opts.dayStr) return null;
  if (opts.startDay < opts.dayStr) return null;

  // Start day: use the later of startDate wall-clock and createdAt wall-clock
  // so mid-day creation does not treat earlier morning slots as due.
  if (
    opts.createdDay === opts.dayStr &&
    compareTimes(opts.createdClock, opts.startClock) > 0
  ) {
    return opts.createdClock;
  }
  return opts.startClock || "00:00";
}

/** True when this slot should not be considered due yet on the given day. */
export function isSlotBeforeCourseStart(opts: {
  timeOfDay: string;
  startDay: string;
  startClock: string;
  createdDay: string;
  createdClock: string;
  dayStr: string;
}): boolean {
  if (!opts.startDay || opts.startDay > opts.dayStr) return true;
  const floor = effectiveStartTimeOnDay(opts);
  if (!floor) return false;
  return compareTimes(opts.timeOfDay, floor) < 0;
}
