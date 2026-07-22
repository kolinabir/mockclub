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
    await updateUser(userId, {
      role: roles.join(","),
      onboardedAt: new Date(),
    });
  } catch {
    return { ok: false, error: "Couldn't save that. Please try again." };
  }

  return { ok: true };
}

/** How many people are waiting to practise — used to make the ask concrete. */
export async function countWaitingCandidates(): Promise<number> {
  try {
    return await getDb()
      .collection("waitlist")
      .countDocuments({ role: "candidate" });
  } catch {
    return 0;
  }
}
