import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RoleChoice } from "@/components/onboarding/role-choice";
import { getCurrentUser } from "@/lib/session";
import {
  countWaitingCandidates,
  hasOnboarded,
} from "@/server/onboarding/onboarding";
import { countInterviewers } from "@/server/profile/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How do you want to take part?",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Already chosen — this page is one-time, so don't strand them here.
  if (await hasOnboarded(user.id)) redirect("/dashboard");

  const [interviewers, waiting] = await Promise.all([
    countInterviewers(),
    countWaitingCandidates(),
  ]);

  const firstName = user.name?.split(" ")[0];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <p className="stamp-label text-ink-soft">Welcome to MockClub</p>
      <h1 className="display mt-3 text-3xl font-semibold sm:text-4xl">
        {firstName ? `${firstName}, how` : "How"} do you want to take part?
      </h1>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
        Someone once gave you an hour of their time. This is where that gets
        passed on. Pick what fits you today — nothing here is permanent.
      </p>

      <div className="mt-8">
        <RoleChoice interviewers={interviewers} waiting={waiting} />
      </div>
    </main>
  );
}
