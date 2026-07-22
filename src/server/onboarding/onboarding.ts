import "server-only";

import { getDb } from "@/server/db/mongo";

/**
 * Onboarding = the one-time "what do you want to be here?" choice.
 *
 * Better Auth assigns every new user `defaultRole: "candidate"`, so the role
 * alone can't tell us whether they actually CHOSE anything. We need an explicit
 * marker, hence `onboardedAt` on the user doc.
 */

export const CHOICES = ["candidate", "interviewer", "both"] as const;
export type OnboardingChoice = (typeof CHOICES)[number];

/** Roles granted per choice. Never includes admin/moderator — not self-grantable. */
const ROLES_FOR: Record<OnboardingChoice, string[]> = {
  candidate: ["candidate"],
  interviewer: ["interviewer"],
  both: ["candidate", "interviewer"],
};

export async function hasOnboarded(userId: string): Promise<boolean> {
  const doc = await getDb()
    .collection<{ id: string; onboardedAt?: Date }>("user")
    .findOne({ id: userId }, { projection: { onboardedAt: 1 } });
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

  // Preserve privileged roles the user already holds (admin/moderator) — the
  // choice only ever adds membership roles on top.
  const privileged = existingRoles.filter(
    (r) => r === "admin" || r === "moderator",
  );
  const roles = [
    ...new Set([...ROLES_FOR[choice as OnboardingChoice], ...privileged]),
  ];

  await getDb()
    .collection("user")
    .updateOne(
      { id: userId },
      { $set: { role: roles.join(","), onboardedAt: new Date() } },
    );

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
