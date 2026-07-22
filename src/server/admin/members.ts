import "server-only";

import { getDb } from "@/server/db/mongo";
import { parseRoles } from "@/server/auth/auth";
import { profileChecklist, type ProfileDoc } from "@/server/profile/profile";
import { users, type UserDoc } from "@/server/users/users";

/**
 * Who is actually on the platform, and are they usable.
 *
 * The existing admin page reports the WAITLIST — people who left an address on
 * the landing page. That says nothing about members, so there was no way to
 * answer the only question that matters before booking opens: of the handful of
 * interviewers who signed up, how many have finished a profile AND set hours?
 * Someone who picked "interviewer" and stopped is invisible in every count.
 *
 * Assembled with four indexed reads and joined in memory rather than a $lookup
 * pipeline. `profile.userId` is the STRING form of `user._id`, so a lookup
 * needs a $toString stage on every document; at admin-page scale (hundreds of
 * members, one viewer, on demand) the plain reads are cheaper to run and far
 * cheaper to read.
 */

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  isInterviewer: boolean;
  /** Null until they finish the form steps. */
  onboardedAt: Date | null;
  timeZone: string | null;
  disciplines: string[];
  /** Every checklist item for their role is done. */
  profileComplete: boolean;
  /** Interviewers only: bookable hours in the materialised horizon. */
  openSlots: number;
  paused: boolean;
  /** The verdict the interviewer sees on their own dashboard. */
  bookable: boolean;
};

export type MemberStats = {
  total: number;
  interviewers: number;
  candidates: number;
  onboarded: number;
  /** Interviewers who are genuinely bookable — the number that gates launch. */
  bookableInterviewers: number;
  openSlots: number;
};

export type MembersView = {
  rows: MemberRow[];
  stats: MemberStats;
  /** True when more members exist than the table is showing. */
  truncated: boolean;
};

/**
 * Hard ceiling on how many members are examined at once.
 *
 * Deliberately above the display cap: the stats are counted across everything
 * loaded, so computing them from a shorter page would make "3 bookable
 * interviewers" mean "3 among the newest 200" while reading as the whole truth.
 * An admin sizing up launch readiness from an under-count is worse than a
 * slower page. Past this, the panel needs real pagination and aggregate counts.
 */
const MAX_MEMBERS = 2000;

export async function listMembers(rowLimit = 200): Promise<MembersView> {
  const db = getDb();

  const people = (await users()
    .find(
      {},
      {
        projection: { email: 1, name: 1, role: 1, onboardedAt: 1 },
        sort: { _id: -1 },
        limit: MAX_MEMBERS,
      },
    )
    .toArray()) as UserDoc[];

  const ids = people.map((p) => p._id.toString());

  const [profiles, slotCounts, settings] = await Promise.all([
    db
      .collection<ProfileDoc>("profile")
      .find({ userId: { $in: ids } }, { projection: { _id: 0 } })
      .toArray(),
    db
      .collection("slots")
      .aggregate<{ _id: string; n: number }>([
        {
          $match: {
            userId: { $in: ids },
            status: "open",
            startsAt: { $gte: new Date() },
          },
        },
        { $group: { _id: "$userId", n: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection<{ userId: string; paused: boolean }>("interviewerSettings")
      .find({ userId: { $in: ids } }, { projection: { userId: 1, paused: 1 } })
      .toArray(),
  ]);

  const profileBy = new Map(profiles.map((p) => [p.userId, p]));
  const slotsBy = new Map(slotCounts.map((s) => [s._id, s.n]));
  const pausedBy = new Map(settings.map((s) => [s.userId, Boolean(s.paused)]));

  const rows: MemberRow[] = people.map((person) => {
    const userId = person._id.toString();
    const roles = parseRoles(person.role);
    const isInterviewer = roles.includes("interviewer");
    const profile = profileBy.get(userId) ?? null;
    const openSlots = slotsBy.get(userId) ?? 0;
    const paused = pausedBy.get(userId) ?? false;

    // The same checklist the member sees, so admin and member can never
    // disagree about whether a profile is finished.
    const profileComplete = profileChecklist(
      profile,
      isInterviewer ? "interviewer" : "candidate",
    ).every((item) => item.done);

    return {
      userId,
      name: person.name ?? "—",
      email: person.email,
      roles,
      isInterviewer,
      onboardedAt: person.onboardedAt ?? null,
      timeZone: profile?.timeZone ?? null,
      disciplines: profile?.disciplines ?? [],
      profileComplete,
      openSlots,
      paused,
      bookable: isInterviewer && profileComplete && !paused && openSlots > 0,
    };
  });

  // Stats count EVERY member examined; only the table is trimmed.
  const stats: MemberStats = {
    total: rows.length,
    interviewers: rows.filter((r) => r.isInterviewer).length,
    candidates: rows.filter((r) => !r.isInterviewer).length,
    onboarded: rows.filter((r) => r.onboardedAt).length,
    bookableInterviewers: rows.filter((r) => r.bookable).length,
    openSlots: rows.reduce((sum, r) => sum + r.openSlots, 0),
  };

  return {
    rows: rows.slice(0, rowLimit),
    stats,
    truncated: rows.length > rowLimit,
  };
}
