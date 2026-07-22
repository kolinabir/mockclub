"use server";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/session";
import { completeOnboarding } from "@/server/onboarding/onboarding";
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

  const result = await completeOnboarding(
    user.id,
    formData.get("choice"),
    user.roles,
  );
  if (!result.ok) return result;

  redirect("/dashboard/profile");
}
