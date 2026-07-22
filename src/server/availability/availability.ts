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

let settingsIndexEnsured = false;

function settings() {
  const c = getDb().collection<InterviewerSettings>("interviewerSettings");
  if (!settingsIndexEnsured) {
    settingsIndexEnsured = true;
    // Every read here filters on userId and there was no index, so both the
    // dashboard's findOne and the admin panel's `$in` over every member were
    // full collection scans. One document per interviewer, so it only grows.
    void c.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
  }
  return c;
}

export async function getSettings(
  userId: string,
): Promise<InterviewerSettings | null> {
  return settings().findOne({ userId }, { projection: { _id: 0 } });
}

/** Cap applied to a member who has never chosen one. */
export const DEFAULT_MAX_SESSIONS_PER_MONTH = 2;

/**
 * `maxSessionsPerMonth` is OPTIONAL.
 *
 * The availability screen no longer asks for it — a number nobody was setting
 * is worse than a sensible default, and the cap has no effect until booking
 * exists. Omitting it must therefore leave any existing value alone rather than
 * reset it, so a member who did choose a cap keeps it.
 */
export async function saveSettings(
  userId: string,
  input: { maxSessionsPerMonth?: unknown; paused: unknown },
): Promise<SaveResult> {
  const raw = input.maxSessionsPerMonth;
  const provided = raw !== undefined && raw !== null && raw !== "";

  const set: Partial<InterviewerSettings> = {
    paused: Boolean(input.paused),
    updatedAt: new Date(),
  };

  if (provided) {
    const max = Number(raw);
    if (!Number.isInteger(max) || max < 1 || max > 30)
      return {
        ok: false,
        error: "Cap must be between 1 and 30 sessions a month.",
      };
    set.maxSessionsPerMonth = max;
  }

  await settings().updateOne(
      { userId },
      {
        $set: set,
        // Only on insert, and only when the caller didn't supply one — a field
        // may not appear in both $set and $setOnInsert.
        ...(provided
          ? {}
          : {
              $setOnInsert: {
                maxSessionsPerMonth: DEFAULT_MAX_SESSIONS_PER_MONTH,
              },
            }),
      },
      { upsert: true },
    );

  return { ok: true };
}
