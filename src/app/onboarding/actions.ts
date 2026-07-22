"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import {
  completeOnboarding,
  hasChosenRole,
} from "@/server/onboarding/onboarding";
import { saveStep } from "@/server/onboarding/steps";
import { rateLimit } from "@/server/rate-limit";

export async function chooseRoleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };

  const { limited } = await rateLimit(`action:onboarding:${user.id}`, {
    max: 10,
    windowSeconds: 60,
  });
  if (limited)
    return {
      ok: false as const,
      error: "Too many attempts. Try again shortly.",
    };

  // The page redirects away once onboarded, but a server action is a public
  // endpoint — without this, replaying it would reset the caller's membership
  // role. Changing roles later belongs to the dashboard, not to onboarding.
  if (await hasChosenRole(user.id)) redirect("/onboarding");

  const result = await completeOnboarding(
    user.id,
    formData.get("choice"),
    user.roles,
  );
  if (!result.ok) return result;

  redirect("/onboarding");
}

/**
 * One action for every step — the step id is data, not a new endpoint. Adding a
 * step later needs no change here; validation lives behind saveStep.
 */
export async function saveOnboardingStepAction(
  stepId: string,
  input: Record<string, unknown>,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };

  const { limited } = await rateLimit(`action:onboarding-step:${user.id}`, {
    max: 40,
    windowSeconds: 60,
  });
  if (limited)
    return {
      ok: false as const,
      error: "Too many changes. Try again shortly.",
    };

  return saveStep(user.id, stepId, input);
}
