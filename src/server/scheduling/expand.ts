import { addMinutes, parseHHMM, wallClockIn, zonedToUtc } from "@/lib/time";

/**
 * Rules -> bookable instants. The whole of the scheduling domain, and none of
 * the database.
 *
 * Deliberately free of `server-only`, Mongo and every other import that needs a
 * running process: this is the part that is hard to get right (override
 * precedence, overlapping windows, DST-safe expansion) and it is worth nothing
 * if it can only be exercised by standing up a replica set and clicking through
 * a form. `scheduling.ts` is the shell that persists what this returns.
 *
 * ⚠️ The availability form imports `analyseRules` and `sessionsIn` from here so
 * that its inline warnings and the stored rules cannot disagree. That makes
 * this module part of the CLIENT bundle: adding `server-only`, a database
 * handle or a `process.env` read to it will break the build.
 */

/**
 * Length of one bookable session. Lives here, not in scheduling.ts, because
 * the form needs it to say how many sessions a window actually yields and must
 * not import a `server-only` module to find out.
 */
export const SLOT_MINUTES = 60;

/**
 * The grid every start and end time must sit on.
 *
 * `HH:MM` accepts 20:09, and nothing downstream breaks on it — expansion just
 * carves 18:00 and 19:00 out of an 18:00-20:09 window and silently drops the
 * nine minutes. But "available 6:00 PM to 8:09 PM" is not something a person
 * means to say, and every odd minute is a slot boundary a candidate has to
 * squint at. Half past is the coarsest grid that still allows 11:30-12:30.
 */
export const TIME_STEP_MINUTES = 30;

/** Last time on the grid — 23:30, since 24:00 isn't a time. */
const LAST_ON_GRID = 24 * 60 - TIME_STEP_MINUTES;

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Nearest time on the grid. Used to correct a typed value, not to reject it. */
export function snapToStep(value: string): string {
  const m = minuteOfDay(value);
  if (m === null) return value;
  const snapped = Math.round(m / TIME_STEP_MINUTES) * TIME_STEP_MINUTES;
  return hhmm(Math.min(Math.max(snapped, 0), LAST_ON_GRID));
}

export function isOnStep(value: string): boolean {
  const m = minuteOfDay(value);
  return m !== null && m % TIME_STEP_MINUTES === 0;
}

/** The shape expansion needs. `AvailabilityRule` in scheduling.ts extends it. */
export type ExpandableRule = {
  /** 0=Sun … 6=Sat in LOCAL days. Used when `date` is null. */
  days: number[];
  /** LOCAL wall clock as a plain string. Never a Date. */
  startTime: string;
  endTime: string;
  /** Non-null ("2026-08-14") => one-off override for that single day. */
  date: string | null;
  /** An override that removes availability instead of adding it. */
  blocked: boolean;
};

export type Window = { start: number; end: number };

/** Minutes past local midnight, or null when malformed. */
export function minuteOfDay(hhmm: string): number | null {
  const t = parseHHMM(hhmm);
  return t ? t.hour * 60 + t.minute : null;
}

/** How many whole slots fit in a window. A 90-minute window holds one hour. */
export function sessionsIn(
  startTime: string,
  endTime: string,
  slotMinutes: number,
): number {
  const start = minuteOfDay(startTime);
  const end = minuteOfDay(endTime);
  if (start === null || end === null || end <= start) return 0;
  return Math.floor((end - start) / slotMinutes);
}

/**
 * Everything wrong with a set of rules, as data.
 *
 * Expansion is forgiving by design — it merges, drops and clamps rather than
 * throwing, because a booking page must render whatever is stored. That
 * forgiveness is exactly what makes bad input invisible: two rules covering
 * 18:00-20:00 and 18:00-19:00 on the same days quietly become one, and the
 * member is left staring at two boxes wondering which one is doing anything.
 *
 * So the merge stays, and this reports what the merge swallowed. Pure, and
 * shared by the form (inline, before saving) and the tests.
 */
export type RuleIssue =
  /** Recurring rule with no weekday selected — expands to nothing. */
  | { kind: "no-days"; index: number }
  /** End is at or before start. */
  | { kind: "inverted"; index: number }
  /** Shorter than one slot, so it yields no bookable session at all. */
  | { kind: "too-short"; index: number }
  /** A start or end that isn't on the half-hour grid, e.g. 20:09. */
  | { kind: "off-step"; index: number; suggestion: { start: string; end: string } }
  /** Trailing minutes that don't fill a whole slot and are discarded. */
  | { kind: "ragged"; index: number; wastedMinutes: number }
  /** Two recurring rules share a weekday AND overlap in time. */
  | { kind: "overlap"; index: number; otherIndex: number; days: number[] }
  /** Two overrides land on the same calendar date. */
  | { kind: "duplicate-date"; index: number; otherIndex: number };

export function analyseRules(
  rules: ExpandableRule[],
  slotMinutes: number,
): RuleIssue[] {
  const issues: RuleIssue[] = [];

  rules.forEach((r, index) => {
    // A blocked override carries placeholder times; judging them is noise.
    if (r.blocked) return;

    const start = minuteOfDay(r.startTime);
    const end = minuteOfDay(r.endTime);

    if (start === null || end === null || end <= start) {
      issues.push({ kind: "inverted", index });
      return;
    }
    if (!r.date && r.days.length === 0) issues.push({ kind: "no-days", index });

    if (!isOnStep(r.startTime) || !isOnStep(r.endTime))
      issues.push({
        kind: "off-step",
        index,
        suggestion: {
          start: snapToStep(r.startTime),
          end: snapToStep(r.endTime),
        },
      });

    const span = end - start;
    if (span < slotMinutes) issues.push({ kind: "too-short", index });
    else if (span % slotMinutes !== 0)
      issues.push({ kind: "ragged", index, wastedMinutes: span % slotMinutes });
  });

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i];
      const b = rules[j];
      if (a.blocked || b.blocked) continue;

      // Two entries for one date: expansion merges them, so only their union
      // survives and neither box on its own describes the result.
      if (a.date && b.date) {
        if (a.date === b.date)
          issues.push({ kind: "duplicate-date", index: j, otherIndex: i });
        continue;
      }
      if (a.date || b.date) continue; // a date and a weekly rule never clash:
      // the date replaces that day outright.

      const days = a.days.filter((d) => b.days.includes(d));
      if (days.length === 0) continue;

      const aStart = minuteOfDay(a.startTime);
      const aEnd = minuteOfDay(a.endTime);
      const bStart = minuteOfDay(b.startTime);
      const bEnd = minuteOfDay(b.endTime);
      if (aStart === null || aEnd === null || bStart === null || bEnd === null)
        continue;

      // Touching is fine (18:00-19:00 then 19:00-20:00 is a real two-hour
      // stretch); strictly overlapping is not.
      if (aStart < bEnd && bStart < aEnd)
        issues.push({
          kind: "overlap",
          index: j,
          otherIndex: i,
          days: days.sort(),
        });
    }
  }

  return issues;
}

/**
 * Sort and merge overlapping or touching windows.
 *
 * Not cosmetic — this is a correctness requirement. Slots are carved from each
 * window independently, so two rules on the same day of 09:00-11:00 and
 * 09:30-11:30 produce bookable hours at 09:00, 09:30, 10:00 and 10:30: four
 * open slots covering overlapping wall-clock time. Two candidates take 09:00
 * and 09:30 and the interviewer is double-booked, with the unique index and the
 * atomic claim both intact and both irrelevant, because those guarantee one
 * booking per slot and the slots themselves overlap.
 *
 * Merging first means every emitted slot is disjoint by construction.
 */
export function mergeWindows(
  windows: { startTime: string; endTime: string }[],
): Window[] {
  const spans: Window[] = [];
  for (const w of windows) {
    const start = minuteOfDay(w.startTime);
    const end = minuteOfDay(w.endTime);
    if (start === null || end === null || start >= end) continue;
    spans.push({ start, end });
  }
  spans.sort((a, b) => a.start - b.start);

  const merged: Window[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    // `<=` so 09:00-10:00 and 10:00-11:00 become one window rather than two
    // that happen to abut — the carve is identical either way, and one window
    // is cheaper to reason about.
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else merged.push({ ...span });
  }
  return merged;
}

/**
 * Expand rules into the local wall-clock windows that apply on one date,
 * as disjoint minute ranges past local midnight.
 */
export function windowsForDate(
  rules: ExpandableRule[],
  isoDate: string,
  weekday: number,
): Window[] {
  const overrides = rules.filter((r) => r.date === isoDate);

  // An override for a date REPLACES the recurring rules that day — that's what
  // makes "not this Thursday" expressible at all.
  if (overrides.length) {
    if (overrides.some((o) => o.blocked)) return [];
    return mergeWindows(overrides);
  }

  return mergeWindows(rules.filter((r) => !r.date && r.days.includes(weekday)));
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The local calendar dates covered by the horizon, starting from the date
 * `from` falls on in `timeZone`.
 *
 * Walks CALENDAR DATES, not fixed 24h steps. Adding 86_400_000ms per day skips
 * a local date whenever clocks spring forward: starting near midnight before a
 * transition, day N+1 lands on the date after next, and that day generates NO
 * slots at all. Verified — an interviewer available "every day" had nothing on
 * 2026-03-29 in London.
 *
 * `Date.UTC` here is pure calendar arithmetic (it rolls month/year over) and
 * never touches a zone, so it cannot be bitten by DST.
 */
export function localDates(
  from: Date,
  timeZone: string,
  horizonDays: number,
): { year: number; month: number; day: number; weekday: number; isoDate: string }[] {
  const startLocal = wallClockIn(from, timeZone);
  const out = [];

  for (let i = 0; i < horizonDays; i++) {
    const cal = new Date(
      Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day + i),
    );
    const year = cal.getUTCFullYear();
    const month = cal.getUTCMonth() + 1;
    const day = cal.getUTCDate();
    out.push({
      year,
      month,
      day,
      weekday: cal.getUTCDay(),
      isoDate: `${year}-${pad(month)}-${pad(day)}`,
    });
  }
  return out;
}

export type SlotSpan = { startsAt: Date; endsAt: Date };

/**
 * Every bookable instant the rules produce in the horizon, disjoint and sorted.
 *
 * Slots strictly after `from` only — the past is never materialised.
 */
export function expandSlots(input: {
  rules: ExpandableRule[];
  timeZone: string;
  from: Date;
  horizonDays: number;
  slotMinutes: number;
}): SlotSpan[] {
  const { rules, timeZone, from, horizonDays, slotMinutes } = input;
  // Keyed by instant so a rule set that somehow yields the same start twice
  // still produces one slot.
  const wanted = new Map<number, SlotSpan>();

  for (const local of localDates(from, timeZone, horizonDays)) {
    for (const w of windowsForDate(rules, local.isoDate, local.weekday)) {
      const at = (minutes: number) =>
        zonedToUtc(
          {
            year: local.year,
            month: local.month,
            day: local.day,
            hour: Math.floor(minutes / 60),
            minute: minutes % 60,
          },
          timeZone,
        );

      const dayStart = at(w.start);
      const dayEnd = at(w.end);

      for (
        let cursor = dayStart;
        addMinutes(cursor, slotMinutes) <= dayEnd;
        cursor = addMinutes(cursor, slotMinutes)
      ) {
        if (cursor <= from) continue; // never materialise the past
        wanted.set(cursor.getTime(), {
          startsAt: cursor,
          endsAt: addMinutes(cursor, slotMinutes),
        });
      }
    }
  }

  return [...wanted.values()].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );
}
