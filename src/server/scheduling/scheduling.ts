import "server-only";

import {
  addMinutes,
  isValidTimeZone,
  parseHHMM,
  parseISODate,
  wallClockIn,
  zonedToUtc,
} from "@/lib/time";
import { getDb } from "@/server/db/mongo";

/**
 * Scheduling — schedules, availability rules, and materialised slots.
 * Implements PLAN.md §5.
 *
 * The interface is deliberately four functions. Everything that makes this hard
 * — DST-safe expansion of recurring rules, override precedence, idempotent slot
 * generation, the indexes that make booking safe — sits behind them, so the
 * booking layer that comes next only has to learn `slotsFor` and `claimSlot`.
 *
 * Two decisions from the plan that must not drift:
 *
 * 1. TIMEZONE LIVES ON THE SCHEDULE, not on each rule. A rule is a local
 *    wall-clock intention ("Tuesdays 18:00"); storing it in UTC loses the zone
 *    and the rule silently shifts an hour at every DST transition, unrepairably.
 * 2. SLOTS ARE MATERIALISED DOCUMENTS. MongoDB has no equivalent of Postgres's
 *    `EXCLUDE USING gist`, so the only sound way to prevent double-booking is to
 *    make each bookable hour a document and claim it atomically.
 */

export const SLOT_MINUTES = 60;

/** How far ahead slots are materialised. Bounded — see the plan's tradeoff note. */
export const HORIZON_DAYS = 28;

export type Schedule = {
  userId: string;
  name: string;
  /** IANA id only — never "BST" or "+06:00". */
  timeZone: string;
  isDefault: boolean;
  updatedAt: Date;
};

export type AvailabilityRule = {
  userId: string;
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

export type Slot = {
  userId: string;
  startsAt: Date;
  endsAt: Date;
  status: "open" | "held" | "booked" | "cancelled" | "expired";
  heldUntil: Date | null;
  bookingId: string | null;
  createdAt: Date;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

let indexesEnsured = false;

function collections() {
  const db = getDb();
  const schedules = db.collection<Schedule>("schedules");
  const rules = db.collection<AvailabilityRule>("availabilityRules");
  const slots = db.collection<Slot>("slots");

  if (!indexesEnsured) {
    indexesEnsured = true;
    // Idempotent and non-blocking; a slow index build must not fail a request.
    void schedules.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
    void rules.createIndex({ userId: 1 }).catch(() => {});

    // THE guarantee. Duplicate slot documents become impossible even if
    // generation runs twice concurrently (PLAN.md §5).
    void slots
      .createIndex({ userId: 1, startsAt: 1 }, { unique: true })
      .catch(() => {});
    // NOT a TTL index. A TTL would DELETE the slot document when heldUntil
    // passed, so an abandoned hold would destroy a bookable hour instead of
    // returning it to the pool. Holds are released by releaseExpiredHolds().
    void slots.createIndex({ heldUntil: 1 }).catch(() => {});
    // Drop the TTL version if an earlier deploy created it.
    void slots.dropIndex("heldUntil_1_ttl").catch(() => {});
    void slots.createIndex({ status: 1, startsAt: 1 }).catch(() => {});
  }

  return { schedules, rules, slots };
}

/* ------------------------------------------------------------------ reading */

export type Availability = {
  timeZone: string;
  rules: AvailabilityRule[];
};

export async function getAvailability(userId: string): Promise<Availability> {
  const { schedules, rules } = collections();
  const [schedule, list] = await Promise.all([
    schedules.findOne({ userId }),
    rules.find({ userId }).toArray(),
  ]);
  return {
    timeZone: schedule?.timeZone ?? "UTC",
    rules: list,
  };
}

/* ------------------------------------------------------------------ writing */

type RuleInput = {
  days: unknown;
  startTime: unknown;
  endTime: unknown;
  date?: unknown;
  blocked?: unknown;
};

function validateRule(
  r: RuleInput,
):
  | { ok: true; rule: Omit<AvailabilityRule, "userId"> }
  | { ok: false; error: string } {
  if (typeof r.startTime !== "string" || typeof r.endTime !== "string")
    return { ok: false, error: "Times must look like 18:00." };

  const startTime = r.startTime;
  const endTime = r.endTime;
  const start = parseHHMM(startTime);
  const end = parseHHMM(endTime);
  if (!start || !end)
    return { ok: false, error: "Times must look like 18:00." };

  // Zero-padded HH:MM sorts correctly as a string, so this is a real comparison.
  if (startTime >= endTime)
    return { ok: false, error: "The end time has to be after the start time." };

  let date: string | null = null;
  if (typeof r.date === "string" && r.date.trim()) {
    if (!parseISODate(r.date))
      return { ok: false, error: "That date isn't valid." };
    date = r.date;
  }

  const days = Array.isArray(r.days)
    ? [
        ...new Set(
          r.days.filter(
            (d): d is number => Number.isInteger(d) && d >= 0 && d <= 6,
          ),
        ),
      ].sort()
    : [];

  // A recurring rule with no days is noise; a dated override doesn't need days.
  if (!date && days.length === 0)
    return { ok: false, error: "Pick at least one day." };

  return {
    ok: true,
    rule: {
      days,
      startTime,
      endTime,
      date,
      blocked: r.blocked === true,
    },
  };
}

/**
 * Replace this member's schedule and rules, then rebuild their slots.
 *
 * Whole-set replacement rather than per-rule editing: the form always submits
 * the complete picture, and a partial update would need diffing that the UI
 * can't express anyway.
 */
export async function saveAvailability(
  userId: string,
  input: { timeZone: unknown; rules: unknown },
): Promise<SaveResult> {
  if (typeof input.timeZone !== "string" || !isValidTimeZone(input.timeZone))
    return { ok: false, error: "Pick a valid time zone." };

  const raw = Array.isArray(input.rules) ? input.rules : [];
  if (raw.length > 50) return { ok: false, error: "That's too many rules." };

  const clean: Omit<AvailabilityRule, "userId">[] = [];
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const result = validateRule(r as RuleInput);
    if (!result.ok) return result;
    clean.push(result.rule);
  }

  const { schedules, rules } = collections();

  await schedules.updateOne(
    { userId },
    {
      $set: {
        userId,
        timeZone: input.timeZone,
        name: "Default",
        isDefault: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await rules.deleteMany({ userId });
  if (clean.length)
    await rules.insertMany(clean.map((r) => ({ ...r, userId })));

  await generateSlots(userId);
  return { ok: true };
}

/* --------------------------------------------------------- materialisation */

/** Expand rules into the local wall-clock windows that apply on one date. */
function windowsForDate(
  rules: AvailabilityRule[],
  isoDate: string,
  weekday: number,
): { startTime: string; endTime: string }[] {
  const overrides = rules.filter((r) => r.date === isoDate);

  // An override for a date REPLACES the recurring rules that day — that's what
  // makes "not this Thursday" expressible at all.
  if (overrides.length) {
    if (overrides.some((o) => o.blocked)) return [];
    return overrides.map((o) => ({
      startTime: o.startTime,
      endTime: o.endTime,
    }));
  }

  return rules
    .filter((r) => !r.date && r.days.includes(weekday))
    .map((r) => ({ startTime: r.startTime, endTime: r.endTime }));
}

/**
 * Rebuild the slot documents for the horizon.
 *
 * Idempotent by construction: inserts are guarded by the unique
 * `{userId, startsAt}` index and duplicate-key errors are expected, not
 * exceptional. Slots that are held or booked are NEVER touched — someone's
 * booking cannot evaporate because they edited their hours.
 */
export async function generateSlots(
  userId: string,
  opts: { from?: Date; days?: number } = {},
): Promise<{ created: number; removed: number }> {
  const { schedules, rules, slots } = collections();

  const schedule = await schedules.findOne({ userId });
  if (!schedule) return { created: 0, removed: 0 };

  const tz = schedule.timeZone;
  const all = await rules.find({ userId }).toArray();

  const from = opts.from ?? new Date();
  const horizon = opts.days ?? HORIZON_DAYS;

  const wanted = new Map<number, { startsAt: Date; endsAt: Date }>();

  // Walk LOCAL CALENDAR DATES, not fixed 24h steps.
  //
  // Adding 86_400_000ms per day skips a local date whenever clocks spring
  // forward: starting near midnight before a transition, day N+1 lands on the
  // date after next, and that day generates NO slots at all. Verified — an
  // interviewer available "every day" had nothing on 2026-03-29 in London.
  //
  // Date.UTC here is pure calendar arithmetic (it rolls month/year over), and
  // never touches a zone, so it can't be bitten by DST.
  const startLocal = wallClockIn(from, tz);

  for (let i = 0; i < horizon; i++) {
    const cal = new Date(
      Date.UTC(startLocal.year, startLocal.month - 1, startLocal.day + i),
    );
    const local = {
      year: cal.getUTCFullYear(),
      month: cal.getUTCMonth() + 1,
      day: cal.getUTCDate(),
      weekday: cal.getUTCDay(),
    };
    const pad = (n: number) => String(n).padStart(2, "0");
    const isoDate = `${local.year}-${pad(local.month)}-${pad(local.day)}`;

    for (const w of windowsForDate(all, isoDate, local.weekday)) {
      const start = parseHHMM(w.startTime);
      const end = parseHHMM(w.endTime);
      if (!start || !end) continue;

      const dayStart = zonedToUtc(
        { year: local.year, month: local.month, day: local.day, ...start },
        tz,
      );
      const dayEnd = zonedToUtc(
        { year: local.year, month: local.month, day: local.day, ...end },
        tz,
      );

      for (
        let cursor = dayStart;
        addMinutes(cursor, SLOT_MINUTES) <= dayEnd;
        cursor = addMinutes(cursor, SLOT_MINUTES)
      ) {
        // Never materialise the past.
        if (cursor <= from) continue;
        wanted.set(cursor.getTime(), {
          startsAt: cursor,
          endsAt: addMinutes(cursor, SLOT_MINUTES),
        });
      }
    }
  }

  // Slots that have already happened are dead weight — the plan flags the
  // combinatorial size of a materialised collection, so it has to be swept.
  // Only untouched ones: a past BOOKED slot is history worth keeping.
  await slots.deleteMany({ userId, status: "open", startsAt: { $lt: from } });

  const horizonEnd = new Date(from.getTime() + horizon * 86_400_000);

  // Drop slots nobody claimed that the rules no longer produce. Held and
  // booked slots are deliberately excluded from this filter.
  const existing = await slots
    .find({ userId, startsAt: { $gte: from, $lt: horizonEnd } })
    .toArray();

  const stale = existing
    .filter((s) => s.status === "open" && !wanted.has(s.startsAt.getTime()))
    .map((s) => s.startsAt);

  let removed = 0;
  if (stale.length) {
    const res = await slots.deleteMany({
      userId,
      status: "open",
      startsAt: { $in: stale },
    });
    removed = res.deletedCount ?? 0;
  }

  const have = new Set(existing.map((s) => s.startsAt.getTime()));
  const toInsert = [...wanted.values()].filter(
    (w) => !have.has(w.startsAt.getTime()),
  );

  let created = 0;
  if (toInsert.length) {
    try {
      const res = await slots.insertMany(
        toInsert.map((w) => ({
          userId,
          startsAt: w.startsAt,
          endsAt: w.endsAt,
          status: "open" as const,
          heldUntil: null,
          bookingId: null,
          createdAt: new Date(),
        })),
        { ordered: false },
      );
      created = res.insertedCount ?? 0;
    } catch (err: unknown) {
      // 11000 here means a concurrent generation already inserted it. That is
      // the unique index doing its job, not a failure. Anything else rethrows.
      const code = (err as { code?: number }).code;
      const writeErrors = (err as { writeErrors?: unknown[] }).writeErrors;
      if (code !== 11000 && !writeErrors) throw err;
      created =
        (err as { result?: { nInserted?: number } }).result?.nInserted ?? 0;
    }
  }

  return { created, removed };
}

/**
 * Return abandoned holds to the pool.
 *
 * A hold is a 10-minute lease taken while a candidate fills in the booking
 * form. If they wander off, the hour must become bookable again — released,
 * never deleted. Called before every read so the pool is self-healing without
 * depending on a cron being alive.
 */
export async function releaseExpiredHolds(userId?: string): Promise<number> {
  const { slots } = collections();
  const res = await slots.updateMany(
    {
      ...(userId ? { userId } : {}),
      status: "held",
      heldUntil: { $lt: new Date() },
    },
    { $set: { status: "open", heldUntil: null, bookingId: null } },
  );
  return res.modifiedCount ?? 0;
}

/** Open slots in a window — what the booking UI will read. */
export async function slotsFor(
  userId: string,
  range: { from: Date; to: Date },
): Promise<Slot[]> {
  const { slots } = collections();
  await releaseExpiredHolds(userId);
  return slots
    .find({
      userId,
      status: "open",
      startsAt: { $gte: range.from, $lt: range.to },
    })
    .sort({ startsAt: 1 })
    .toArray();
}

/** How many bookable hours this member currently has. Drives "are you listed?". */
export async function countOpenSlots(userId: string): Promise<number> {
  const { slots } = collections();
  await releaseExpiredHolds(userId);
  return slots.countDocuments({
    userId,
    status: "open",
    startsAt: { $gte: new Date() },
  });
}
