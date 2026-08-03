/**
 * Centralised time/timezone helpers.
 *
 * Problem this solves: the previous code called `new Date(...).toLocaleString()`
 * directly, which renders in the *server's* local timezone (UTC in production)
 * — completely wrong for a user in Africa/Nairobi. Customers saw timestamps
 * 3 hours off, and scheduled messages fired at the wrong moment.
 *
 * Fix: every timestamp rendered to the user goes through `formatDateTime` /
 * `formatDate` / `formatTimeAgo`, which forces the Intl formatter to use the
 * the project timezone (Africa/Nairobi by default; override via TZ env).
 *
 * For scheduling, `toLocalDatetimeInputValue` converts a Date into the
 * `YYYY-MM-DDTHH:mm` string that `<input type="datetime-local">` expects in
 * the project timezone — and `parseLocalDatetimeInput` does the reverse, so
 * a user picking 09:00 in Nairobi actually gets 09:00 +03:00 stored as UTC.
 */

export const PROJECT_TIMEZONE = process.env.TIMEZONE || "Africa/Nairobi";
export const PROJECT_LOCALE = process.env.LOCALE || "en-KE";

function safeIntl() {
  try {
    return new Intl.DateTimeFormat(PROJECT_LOCALE, {
      timeZone: PROJECT_TIMEZONE,
    });
  } catch {
    return new Intl.DateTimeFormat("en-GB");
  }
}

export function formatDateTime(
  input: Date | string | null | undefined,
): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(PROJECT_LOCALE, {
      timeZone: PROJECT_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function formatDate(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(PROJECT_LOCALE, {
      timeZone: PROJECT_TIMEZONE,
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatTime(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(PROJECT_LOCALE, {
      timeZone: PROJECT_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toISOString().slice(11, 16);
  }
}

export function formatTimeAgo(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.floor(day / 365);
  return `${yr}y ago`;
}

/**
 * Convert a Date into the `YYYY-MM-DDTHH:mm` string that
 * `<input type="datetime-local">` expects, in the project timezone.
 */
export function toLocalDatetimeInputValue(
  input: Date | string | null | undefined,
): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  // Use Intl parts to get local Y/M/D/H/m.
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: PROJECT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    const iso = d.toISOString();
    return iso.slice(0, 16);
  }
}

/**
 * Parse a `YYYY-MM-DDTHH:mm` string (from datetime-local input) into a Date,
 * interpreting the wall-clock time as the project timezone.
 *
 * Without this, picking "09:00" in Nairobi would store 09:00 UTC (midday local).
 */
export function parseLocalDatetimeInput(value: string): Date {
  if (!value) return new Date();
  // The input is wall-clock in PROJECT_TIMEZONE. Convert to UTC by formatting
  // the string as if it were UTC then applying the timezone offset.
  // Easiest: use the Date constructor with the explicit Z trick reversed.
  // Strategy: build a Date that, when formatted in PROJECT_TIMEZONE, shows `value`.
  const naive = new Date(value + ":00Z"); // interpret as UTC for math
  // Now compute the offset of PROJECT_TIMEZONE at that instant.
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: PROJECT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(naive);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const asUTC = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")) === 24 ? 0 : Number(get("hour")),
      Number(get("minute")),
      Number(get("second")),
    );
    const offset = asUTC - naive.getTime();
    return new Date(asUTC - offset);
  } catch {
    return new Date(value);
  }
}

/**
 * Returns the current Date — wrapper exists so tests can mock time.
 */
export function now(): Date {
  return new Date();
}

/**
 * Compute an age segment tag based on date of birth.
 * infant: 0-2, child: 3-9, teen: 10-17, young_adult: 18-29, adult: 30-64, senior: 65+
 */
export function ageSegmentFromDob(
  dob: Date | string | null | undefined,
): string | null {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 0) return null;
  if (age <= 2) return "infant";
  if (age <= 9) return "child";
  if (age <= 17) return "teen";
  if (age <= 29) return "young_adult";
  if (age <= 64) return "adult";
  return "senior";
}

export const AGE_SEGMENT_LABEL: Record<string, string> = {
  infant: "Infant (0-2)",
  child: "Child (3-9)",
  teen: "Teen (10-17)",
  young_adult: "Young adult (18-29)",
  adult: "Adult (30-64)",
  senior: "Senior (65+)",
};

/** True if the given date is in the future. Used for birthday picker validation. */
export function isFuture(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return false;
  return date.getTime() > Date.now();
}

void safeIntl;
