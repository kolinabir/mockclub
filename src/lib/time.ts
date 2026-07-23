/**
 * Time wrapper. AGENTS.md: use this, never `Date` arithmetic or Luxon directly.
 *
 * The whole scheduling model turns on ONE conversion: a recurring rule is a
 * local wall-clock string ("18:00") plus an IANA zone, and it must become a UTC
 * instant on a given calendar day. That conversion is the only place DST can
 * bite, so it lives here, alone, and is tested against real transitions.
 *
 * Implemented on Intl rather than Luxon deliberately: this is the entire
 * surface we need, Intl carries the same IANA database, and it adds nothing to
 * the serverless bundle.
 */

/** Milliseconds a zone is ahead of UTC at a given instant. */
function offsetAt(utcMs: number, timeZone: string): number {
  // formatToParts in a zone gives the local wall-clock reading of that instant.
  // Interpreting those digits AS UTC and subtracting recovers the offset.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // hour can format as 24 at midnight in some ICU versions; normalise to 0.
  const hour = get("hour") % 24;

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

export type WallClock = {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/**
 * Local wall-clock in `timeZone` -> UTC instant.
 *
 * Two passes, because the offset depends on the instant we're solving for. The
 * first guess uses the offset at the naive timestamp; if the true instant lands
 * on the other side of a DST change, the second pass corrects it.
 *
 * Ambiguous and skipped times (the hour repeated or missing at a transition)
 * resolve deterministically rather than throwing — a booking system must never
 * fail to render a week because a rule happens to touch 02:30 on a Sunday.
 */
export function zonedToUtc(wall: WallClock, timeZone: string): Date {
  const naive = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
  );

  const firstGuess = naive - offsetAt(naive, timeZone);
  const corrected = naive - offsetAt(firstGuess, timeZone);
  return new Date(corrected);
}

/** The calendar date and weekday an instant falls on, as seen in `timeZone`. */
export function wallClockIn(
  instant: Date,
  timeZone: string,
): WallClock & { weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    weekday: DAYS.indexOf(get("weekday")),
  };
}

/** "HH:MM" -> {hour, minute}, or null when malformed. */
export function parseHHMM(v: string): { hour: number; minute: number } | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v);
  if (!m) return null;
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** "2026-08-14" -> {year, month, day}, or null when malformed. */
export function parseISODate(
  v: string,
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Calendar date in a zone, as "YYYY-MM-DD". */
export function isoDateIn(instant: Date, timeZone: string): string {
  const w = wallClockIn(instant, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/**
 * Canonical IANA id, or null.
 *
 * Neither obvious check works alone, and both failures are real:
 *
 *  - `Intl.supportedValuesOf("timeZone")` lists only CANONICAL zones. It omits
 *    "UTC", every "Etc/*", and legacy aliases like "US/Eastern" — all valid and
 *    all reported by real browsers. Filtering on it rejects those members.
 *  - `new Intl.DateTimeFormat({timeZone})` accepts "+06:00", "BST" and "IST",
 *    which AGENTS.md forbids: an offset or abbreviation carries no DST rules,
 *    so a recurring rule stored against one silently shifts an hour twice a
 *    year and cannot be repaired afterwards.
 *
 * So: let Intl resolve and canonicalise it (this also fixes casing), then
 * require the result to actually look like a zone id rather than an offset.
 */
export function canonicalTimeZone(tz: unknown): string | null {
  if (typeof tz !== "string" || !tz.trim()) return null;

  const raw = tz.trim();

  // Reject abbreviations by SHAPE, before Intl gets to guess. Intl resolves
  // "BST" to Asia/Dhaka and "IST" to Asia/Calcutta — both abbreviations are
  // ambiguous (BST is also British Summer Time), and it silently picks one.
  // A London volunteer typing "BST" would be scheduled in Bangladesh.
  // Every real IANA id is either "UTC" or contains a "/".
  if (raw.toUpperCase() !== "UTC" && !raw.includes("/")) return null;

  let resolved: string;
  try {
    resolved = new Intl.DateTimeFormat("en", {
      timeZone: raw,
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }

  // "UTC", or Region/City (optionally Region/City/Sub). Anything with a sign or
  // no separator is an offset or abbreviation, and is rejected.
  const IANA = /^(UTC|[A-Za-z]+\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)?)$/;
  return IANA.test(resolved) ? resolved : null;
}

export function isValidTimeZone(tz: string): boolean {
  return canonicalTimeZone(tz) !== null;
}

export const MINUTE_MS = 60_000;
export const addMinutes = (d: Date, n: number) =>
  new Date(d.getTime() + n * MINUTE_MS);
