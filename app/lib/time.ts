/**
 * Centralised time/timezone helpers.
 *
 * Problem this solves: the previous code called `new Date(...).toLocaleString()`
 * directly, which renders in the *server's* local timezone (UTC in production)
 * — completely wrong for a user in Africa/Nairobi. Customers saw timestamps
 * 3 hours off, and scheduled messages fired at the wrong moment.
 *
 * Fix: every timestamp rendered to the user goes through `formatDateTime` /
 * `formatDate` / `formatTimeAgo`, which forces the Intl formatter to use
 * the project timezone (Africa/Nairobi by default; override via TIMEZONE env).
 *
 * For scheduling, `toLocalDatetimeInputValue` converts a Date into the
 * `YYYY-MM-DDTHH:mm` string that `<input type="datetime-local">` expects in
 * the project timezone — and `parseLocalDatetimeInput` does the reverse, so
 * a user picking 09:00 in Nairobi actually gets 09:00 +03:00 stored as UTC.
 *
 * Date-only fields (`<input type="date">`) use `parseLocalDateInput` /
 * `toLocalDateInputValue` so "2026-08-06" means midnight in the project TZ,
 * not midnight UTC (which would show as the previous evening in Nairobi).
 */

export const PROJECT_TIMEZONE = process.env.TIMEZONE || "Africa/Nairobi";
export const PROJECT_LOCALE = process.env.LOCALE || "en-KE";

/** Parts helper — always in PROJECT_TIMEZONE. */
function zonedParts(
  d: Date,
  options: Intl.DateTimeFormatOptions = {},
): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PROJECT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...options,
  }).formatToParts(d);
  const out: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") out[p.type] = p.value;
  }
  // Some engines emit hour "24" for midnight — normalise to "00".
  if (out.hour === "24") out.hour = "00";
  return out;
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
    return toLocalDateInputValue(d) || d.toISOString().slice(0, 10);
  }
}

export function formatTime(input: Date | string | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  // Always zero-padded HH:mm via formatToParts so string compares with
  // MedicationSchedule.timeOfDay ("08:00") stay reliable across locales.
  try {
    const p = zonedParts(d);
    return `${p.hour ?? "00"}:${p.minute ?? "00"}`;
  } catch {
    return "—";
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
  try {
    const p = zonedParts(d);
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch {
    return d.toISOString().slice(0, 16);
  }
}

/**
 * Convert a Date into `YYYY-MM-DD` for `<input type="date">`, in project TZ.
 * Never use `date.toISOString().slice(0, 10)` — that is always UTC and shifts
 * evening Nairobi times onto the previous calendar day.
 */
export function toLocalDateInputValue(
  input: Date | string | null | undefined,
): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  try {
    const p = zonedParts(d);
    return `${p.year}-${p.month}-${p.day}`;
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** Today's calendar date in the project timezone as `YYYY-MM-DD`. */
export function localTodayStr(at: Date = new Date()): string {
  return toLocalDateInputValue(at);
}

/** Current wall-clock datetime in project TZ as `YYYY-MM-DDTHH:mm`. */
export function localNowDatetimeInputValue(at: Date = new Date()): string {
  return toLocalDatetimeInputValue(at);
}

/**
 * Parse a `YYYY-MM-DDTHH:mm` (or with seconds) string from datetime-local into
 * a Date, interpreting the wall-clock time as the project timezone.
 *
 * Without this, picking "09:00" in Nairobi would store 09:00 UTC (= 12:00 local).
 *
 * Algorithm:
 *   1. Treat the wall-clock components as if they were UTC → `utcGuess`
 *   2. Format that instant in PROJECT_TIMEZONE → see what local time it shows
 *   3. offset = (local-as-UTC-ms) − utcGuess
 *   4. real UTC = utcGuess − offset
 *
 * Example (Africa/Nairobi, UTC+3): wall 09:00 → utcGuess 09:00Z → formats as
 * 12:00 local → offset +3h → result 06:00Z (= 09:00 Nairobi). ✓
 */
export function parseLocalDatetimeInput(value: string): Date {
  const raw = String(value || "").trim();
  if (!raw) return new Date();

  // Accept "YYYY-MM-DD", "YYYY-MM-DDTHH:mm", "YYYY-MM-DDTHH:mm:ss", space sep.
  const normalised = raw.includes("T") ? raw : raw.includes(" ") ? raw.replace(" ", "T") : `${raw}T00:00`;
  const m = normalised.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) {
    const fallback = new Date(raw);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  const second = Number(m[6] || "0");

  // Step 1: pretend the wall clock is UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

  try {
    // Step 2: what local wall clock does that UTC instant show in PROJECT_TZ?
    const p = zonedParts(new Date(utcGuess));
    const asLocalMs = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      Number(p.hour),
      Number(p.minute),
      Number(p.second || "0"),
    );
    // Step 3–4: subtract the TZ offset so wall time lands correctly.
    const offset = asLocalMs - utcGuess;
    return new Date(utcGuess - offset);
  } catch {
    // Last resort: append Z (wrong for non-UTC, but better than Invalid Date).
    return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${String(second).padStart(2, "0")}Z`);
  }
}

/**
 * Parse a `YYYY-MM-DD` date-only string as midnight in the project timezone.
 * Prefer this over `new Date("YYYY-MM-DD")`, which is always UTC midnight.
 */
export function parseLocalDateInput(value: string): Date {
  const raw = String(value || "").trim();
  if (!raw) return new Date();
  // If a full datetime slipped through, still honour project TZ.
  if (raw.includes("T") || raw.includes(" ")) {
    return parseLocalDatetimeInput(raw);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const fallback = new Date(raw);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }
  return parseLocalDatetimeInput(`${raw}T00:00`);
}

/**
 * Returns the current Date — wrapper exists so tests can mock time.
 */
export function now(): Date {
  return new Date();
}

/**
 * Calendar date key (`YYYY-MM-DD`) for a Date in the project timezone.
 * Use this instead of `date.toISOString().slice(0, 10)`.
 */
export function localDateKey(input: Date | string | null | undefined): string {
  return toLocalDateInputValue(input);
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
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
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
