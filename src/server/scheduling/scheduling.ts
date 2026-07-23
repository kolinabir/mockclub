import "server-only";

import { isValidTimeZone, parseHHMM, parseISODate } from "@/lib/time";
import { getDb } from "@/server/db/mongo";
import { getProfile } from "@/server/profile/profile";
import {
  SLOT_MINUTES,
  expandSlots,
  isOnStep,
  type ExpandableRule,
} from "@/server/scheduling/expand";

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
 *    The schedule's copy MIRRORS the profile — the profile is where a member
 *    actually picks their zone, so it is the single source and `syncTimeZone`
 *    is the only thing that copies it here. Two independent writers meant a
 *    member could move to another country and keep every slot at the old
 *    offset, with no screen anywhere showing the disagreement.
 * 2. SLOTS ARE MATERIALISED DOCUMENTS. MongoDB has no equivalent of Postgres's
 *    `EXCLUDE USING gist`, so the only sound way to prevent double-booking is to
 *    make each bookable hour a document and claim it atomically.
 */

export { SLOT_MINUTES };

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

/** A stored rule: what expansion needs, plus its owner. */
export type AvailabilityRule = ExpandableRule & { userId: string };

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

  // A blocked day carries placeholder hours that nothing reads, so the grid
  // doesn't apply to it. Everything else must land on the half hour: `HH:MM`
  // happily accepts 20:09, and expansion would silently discard the odd nine
  // minutes rather than complain.
  if (r.blocked !== true && (!isOnStep(startTime) || !isOnStep(endTime)))
    return {
      ok: false,
      error: "Times need to be on the hour or the half hour.",
    };

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
 * The zone this member's hours are interpreted in.
 *
 * The profile wins: it is the field the member edits, so anything else is a
 * stale copy. Falls back to the schedule only for members who set hours before
 * the profile carried a zone.
 */
async function resolveTimeZone(userId: string): Promise<string | null> {
  const [profile, schedule] = await Promise.all([
    getProfile(userId),
    collections().schedules.findOne({ userId }),
  ]);

  for (const tz of [profile?.timeZone, schedule?.timeZone]) {
    if (typeof tz === "string" && isValidTimeZone(tz)) return tz;
  }
  return null;
}

/**
 * Copy the profile's zone onto the schedule, rebuilding slots if it moved.
 *
 * Called after anything that writes `profile.timeZone`. Without it, changing
 * your zone leaves every materialised slot at the old offset: the hours read
 * "18:00" on screen and resolve to an instant an hour or two away, and nothing
 * surfaces the disagreement until someone misses a session.
 */
export async function syncTimeZone(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  const tz = profile?.timeZone;
  if (typeof tz !== "string" || !isValidTimeZone(tz)) return false;

  const { schedules } = collections();
  const schedule = await schedules.findOne({ userId });
  if (schedule?.timeZone === tz) return false;

  await schedules.updateOne(
    { userId },
    {
      $set: { userId, timeZone: tz, updatedAt: new Date() },
      $setOnInsert: { name: "Default", isDefault: true },
    },
    { upsert: true },
  );

  // Only worth the work once there are rules to re-expand.
  if (schedule) await generateSlots(userId);
  return true;
}

/**
 * Replace this member's rules, then rebuild their slots.
 *
 * Whole-set replacement rather than per-rule editing: the form always submits
 * the complete picture, and a partial update would need diffing that the UI
 * can't express anyway.
 *
 * The zone is NOT taken from the submitted form — see `resolveTimeZone`.
 */
export async function saveAvailability(
  userId: string,
  input: { rules: unknown },
): Promise<SaveResult> {
  const timeZone = await resolveTimeZone(userId);
  if (!timeZone)
    return {
      ok: false,
      error: "Set your time zone on your profile before adding hours.",
    };

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
        timeZone,
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

  // All of the domain logic — override precedence, overlap merging, the
  // DST-safe calendar walk — lives in expand.ts and is pure. What follows is
  // only the diff against what is already stored.
  const spans = expandSlots({
    rules: all,
    timeZone: tz,
    from,
    horizonDays: horizon,
    slotMinutes: SLOT_MINUTES,
  });
  const wanted = new Map(spans.map((s) => [s.startsAt.getTime(), s]));

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
      // The driver's BulkWriteResult exposes `insertedCount`; `nInserted` is
      // the pre-v4 name and is undefined here, so reading only that reported
      // "0 created" for every partially-duplicated run.
      const partial = (
        err as { result?: { insertedCount?: number; nInserted?: number } }
      ).result;
      created = partial?.insertedCount ?? partial?.nInserted ?? 0;
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

/**
 * Roll the horizon forward for everyone. The nightly sweep.
 *
 * `generateSlots` only ever runs when a member edits their hours, and it looks
 * HORIZON_DAYS ahead — so an interviewer who sets their week once and never
 * touches it again runs out of bookable hours a month later and quietly stops
 * appearing. This is what keeps the window sliding.
 *
 * Sequential on purpose: a nightly job has all the time it needs, and firing
 * hundreds of concurrent regenerations at an M0 pool of 10 would not end well.
 * One member's bad data must not abort the sweep for everyone behind them.
 */
export async function generateSlotsForAll(): Promise<{
  members: number;
  created: number;
  removed: number;
  failed: number;
}> {
  const { rules } = collections();

  let created = 0;
  let removed = 0;
  let failed = 0;

  // Driven off RULES, not schedules. Every member gets a schedule document the
  // moment they finish onboarding (syncTimeZone seeds the zone mirror), so
  // sweeping schedules would walk every candidate on the platform to rebuild
  // nothing. Only someone with availability rules has slots to roll forward.
  //
  // Read up front rather than iterating a live cursor: regenerating one member
  // takes several round trips, so a cursor held open across all of them idles
  // past the server's 10-minute cursor timeout and the sweep dies half-done —
  // having already rebuilt some members and not others.
  const userIds = await rules.distinct("userId");

  for (const userId of userIds) {
    try {
      const result = await generateSlots(userId);
      created += result.created;
      removed += result.removed;
    } catch {
      failed++;
    }
  }

  await releaseExpiredHolds();
  return { members: userIds.length, created, removed, failed };
}

/**
 * The soonest hour someone could book, or null.
 *
 * A findOne with a sort rather than reading `slotsFor` and taking [0] — the
 * horizon can hold a few hundred slots per member and the dashboard needs one.
 */
export async function nextOpenSlot(userId: string): Promise<Date | null> {
  const { slots } = collections();
  await releaseExpiredHolds(userId);
  const slot = await slots.findOne(
    { userId, status: "open", startsAt: { $gte: new Date() } },
    { sort: { startsAt: 1 }, projection: { startsAt: 1 } },
  );
  return slot?.startsAt ?? null;
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
