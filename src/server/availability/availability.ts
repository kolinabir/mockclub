import "server-only";

import { getDb } from "@/server/db/mongo";

/**
 * Interviewer availability — recurring weekly rules.
 *
 * Stored as LOCAL wall-clock ("18:00") + days[] + the IANA zone on the profile.
 * Never UTC: "Tuesdays 18:00" is an intention, not an instant. Storing it in UTC
 * silently shifts an hour at every DST transition and can't be repaired, because
 * the original zone is gone. (PLAN.md §4.)
 */

export type AvailabilityRule = {
  userId: string;
  /** 0=Sun … 6=Sat, in the interviewer's own local days. */
  days: number[];
  startTime: string; // "18:00" local
  endTime: string; // "20:00" local
};

export type InterviewerSettings = {
  userId: string;
  /** Self-set cap — burnout protection. ADPList's documented failure mode. */
  maxSessionsPerMonth: number;
  paused: boolean;
  updatedAt: Date;
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function getAvailability(
  userId: string,
): Promise<AvailabilityRule[]> {
  return getDb()
    .collection<AvailabilityRule>("availabilityRule")
    .find({ userId })
    .toArray();
}

export async function getSettings(
  userId: string,
): Promise<InterviewerSettings | null> {
  return getDb()
    .collection<InterviewerSettings>("interviewerSettings")
    .findOne({ userId });
}

export async function saveAvailability(
  userId: string,
  rules: { days: unknown; startTime: unknown; endTime: unknown }[],
): Promise<SaveResult> {
  const clean: AvailabilityRule[] = [];

  for (const r of rules) {
    const days = Array.isArray(r.days)
      ? [
          ...new Set(
            r.days.filter(
              (d): d is number => Number.isInteger(d) && d >= 0 && d <= 6,
            ),
          ),
        ]
      : [];
    if (days.length === 0) continue; // a rule with no days is just noise

    if (typeof r.startTime !== "string" || !HHMM.test(r.startTime))
      return { ok: false, error: "Start time must look like 18:00." };
    if (typeof r.endTime !== "string" || !HHMM.test(r.endTime))
      return { ok: false, error: "End time must look like 20:00." };
    if (r.startTime >= r.endTime)
      return { ok: false, error: "End time must be after the start time." };

    clean.push({ userId, days, startTime: r.startTime, endTime: r.endTime });
  }

  const coll = getDb().collection<AvailabilityRule>("availabilityRule");
  // Replace-all: simplest correct semantics for "here is my week".
  await coll.deleteMany({ userId });
  if (clean.length) await coll.insertMany(clean);

  return { ok: true };
}

export async function saveSettings(
  userId: string,
  input: { maxSessionsPerMonth: unknown; paused: unknown },
): Promise<SaveResult> {
  const max = Number(input.maxSessionsPerMonth);
  if (!Number.isInteger(max) || max < 1 || max > 30)
    return {
      ok: false,
      error: "Cap must be between 1 and 30 sessions a month.",
    };

  await getDb()
    .collection<InterviewerSettings>("interviewerSettings")
    .updateOne(
      { userId },
      {
        $set: {
          maxSessionsPerMonth: max,
          paused: Boolean(input.paused),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );

  return { ok: true };
}
