import "server-only";

import { getDb } from "@/server/db/mongo";
import { findUser, updateUser } from "@/server/users/users";

/**
 * Onboarding = the one-time "what do you want to be here?" choice.
 *
 * Better Auth assigns every new user `defaultRole: "candidate"`, so the role
 * alone can't tell us whether they actually CHOSE anything. Hence an explicit
 * `onboardedAt` marker.
 */

export const CHOICES = ["candidate", "interviewer"] as const;
export type OnboardingChoice = (typeof CHOICES)[number];

/**
 * Roles granted per choice. Read from this map, never from the submitted
 * value, so the action can't be used to grant admin or moderator.
 */
const ROLES_FOR: Record<OnboardingChoice, string[]> = {
  candidate: ["candidate"],
  interviewer: ["interviewer"],
};

export async function hasOnboarded(userId: string): Promise<boolean> {
  const doc = await findUser(userId, { onboardedAt: 1 });
  return Boolean(doc?.onboardedAt);
}

/** Have they picked candidate/interviewer yet? Precedes the form steps. */
export async function hasChosenRole(userId: string): Promise<boolean> {
  const doc = await findUser(userId, { roleChosenAt: 1 });
  return Boolean(doc?.roleChosenAt);
}

export type CompleteResult = { ok: true } | { ok: false; error: string };

export async function completeOnboarding(
  userId: string,
  choice: unknown,
  existingRoles: string[],
): Promise<CompleteResult> {
  if (
    typeof choice !== "string" ||
    !CHOICES.includes(choice as OnboardingChoice)
  )
    return { ok: false, error: "Pick how you want to take part." };

  // Preserve privileged roles the user already holds — the choice only ever
  // sets membership roles, and must never strip admin/moderator.
  const privileged = existingRoles.filter(
    (r) => r === "admin" || r === "moderator",
  );
  const roles = [
    ...new Set([...ROLES_FOR[choice as OnboardingChoice], ...privileged]),
  ];

  try {
    // Role only. `onboardedAt` belongs to the LAST form step (see steps.ts) —
    // setting it here marked someone fully onboarded the moment they picked a
    // role, so /onboarding sent them straight to the dashboard and all four
    // steps were skipped.
    await updateUser(userId, {
      role: roles.join(","),
      roleChosenAt: new Date(),
    });
  } catch {
    return { ok: false, error: "Couldn't save that. Please try again." };
  }

  return { ok: true };
}

/**
 * How many people are waiting to practise — used to make the ask concrete on an
 * interviewer's dashboard.
 *
 * Counts MEMBERS, not the closed waitlist. Reading the old collection was right
 * while signup didn't exist; the moment it did, the number stopped moving and
 * would have gone on reading as the truth to every interviewer looking at it.
 *
 * Anchored to comma boundaries for the same reason as countInterviewers(): the
 * role field is a comma-joined list, and an unanchored match would also catch a
 * future role that merely contains "candidate".
 */
export async function countWaitingCandidates(): Promise<number> {
  try {
    return await getDb()
      .collection("user")
      .countDocuments({ role: /(^|,)\s*candidate\s*(,|$)/ });
  } catch {
    return 0;
  }
}
