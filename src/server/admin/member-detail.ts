import "server-only";

import { parseRoles } from "@/server/auth/auth";
import { getDb } from "@/server/db/mongo";
import {
  getProfile,
  profileChecklist,
  type ChecklistItem,
  type ProfileDoc,
} from "@/server/profile/profile";
import {
  getAvailability,
  type Availability,
} from "@/server/scheduling/scheduling";
import { findUser, type UserDoc } from "@/server/users/users";

/**
 * Everything the admin panel knows about one member, joined from the
 * collections that already exist. Read-only by design — this module has no
 * writes, so nothing here can be the mutation that went wrong.
 *
 * `bookable` uses the same formula as the directory (members.ts) and the
 * member's own dashboard, so the three views can never disagree.
 */

/** Better Auth stores these on `user`, but UserDoc only declares what the
 *  app itself writes — extend locally rather than widening the shared type. */
type AuthUserExtras = { image?: string | null; createdAt?: Date };

export type MemberDetail = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  roles: string[];
  isInterviewer: boolean;

  createdAt: Date | null;
  roleChosenAt: Date | null;
  onboardedAt: Date | null;
  welcomeEmailSentAt: Date | null;
  /** Onboarded but never welcomed — the trace of a failed send. */
  welcomeMissing: boolean;

  profile: ProfileDoc | null;
  checklist: ChecklistItem[];
  profileComplete: boolean;

  /** Interviewers only; null for candidates. */
  availability: Availability | null;
  openSlots: number;
  paused: boolean;
  bookable: boolean;
};

export async function getMemberDetail(
  userId: string,
): Promise<MemberDetail | null> {
  const person = (await findUser(userId)) as
    | (UserDoc & AuthUserExtras)
    | null;
  if (!person) return null;

  const id = person._id.toString();
  const roles = parseRoles(person.role);
  const isInterviewer = roles.includes("interviewer");
  const db = getDb();

  const [profile, availability, openSlots, settings] = await Promise.all([
    getProfile(id),
    isInterviewer ? getAvailability(id) : Promise.resolve(null),
    db.collection("slots").countDocuments({
      userId: id,
      status: "open",
      startsAt: { $gte: new Date() },
    }),
    db
      .collection<{ userId: string; paused?: boolean }>("interviewerSettings")
      .findOne({ userId: id }, { projection: { paused: 1 } }),
  ]);

  const checklist = profileChecklist(
    profile,
    isInterviewer ? "interviewer" : "candidate",
  );
  const profileComplete = checklist.every((item) => item.done);
  const paused = Boolean(settings?.paused);

  const onboardedAt = person.onboardedAt ?? null;
  const welcomeEmailSentAt = person.welcomeEmailSentAt ?? null;

  return {
    userId: id,
    name: person.name ?? "—",
    email: person.email,
    image: person.image ?? null,
    roles,
    isInterviewer,

    createdAt: person.createdAt ?? null,
    roleChosenAt: person.roleChosenAt ?? null,
    onboardedAt,
    welcomeEmailSentAt,
    welcomeMissing: Boolean(onboardedAt) && !welcomeEmailSentAt,

    profile,
    checklist,
    profileComplete,

    availability,
    openSlots,
    paused,
    bookable: isInterviewer && profileComplete && !paused && openSlots > 0,
  };
}
