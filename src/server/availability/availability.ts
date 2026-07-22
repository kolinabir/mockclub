import "server-only";

import { getDb } from "@/server/db/mongo";

/**
 * An interviewer's own limits — how much they're willing to take on.
 *
 * Rules, schedules and slots used to live here too; they now belong to
 * server/scheduling, which owns the schedule (and therefore the IANA zone),
 * date overrides and the materialised slots that make booking safe (PLAN.md §5).
 * What's left is deliberately just burnout protection.
 */

export type InterviewerSettings = {
  userId: string;
  /** Self-set cap — burnout protection. ADPList's documented failure mode. */
  maxSessionsPerMonth: number;
  paused: boolean;
  updatedAt: Date;
};

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function getSettings(
  userId: string,
): Promise<InterviewerSettings | null> {
  return getDb()
    .collection<InterviewerSettings>("interviewerSettings")
    .findOne({ userId });
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
