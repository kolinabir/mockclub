"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import {
  completeOnboarding,
  hasOnboarded,
} from "@/server/onboarding/onboarding";
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
  if (await hasOnboarded(user.id)) redirect("/dashboard");

  const result = await completeOnboarding(
    user.id,
    formData.get("choice"),
    user.roles,
  );
  if (!result.ok) return result;

  redirect("/dashboard/profile");
}
