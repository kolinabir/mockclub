import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { RoleChoice } from "@/components/onboarding/role-choice";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/session";
import {
  countWaitingCandidates,
  hasChosenRole,
  hasOnboarded,
} from "@/server/onboarding/onboarding";
import { getState } from "@/server/onboarding/steps";
import { LANGUAGES, countInterviewers } from "@/server/profile/profile";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

/** From the runtime's own tz database rather than a hand-kept list. */
function timeZones(): string[] {
  const supported = (
    Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
  ).supportedValuesOf?.("timeZone");
  return supported ?? ["UTC"];
}

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // Finished already — this flow is one-time.
  if (await hasOnboarded(user.id)) redirect("/dashboard");

  // Stage 1: pick candidate or interviewer.
  if (!(await hasChosenRole(user.id))) {
    const [interviewers, waiting] = await Promise.all([
      countInterviewers(),
      countWaitingCandidates(),
    ]);

    const firstName = user.name?.split(" ")[0];

    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <div className="flex items-start justify-between gap-4">
          <p className="stamp-label text-ink-soft">Welcome to MockClub</p>
          <ThemeToggle />
        </div>
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

  // Stage 2: the form steps. `getState` decides which one — a partly-filled
  // draft resumes where it stopped rather than starting over.
  const role = user.isInterviewer ? "interviewer" : "candidate";
  const state = await getState(user.id, role);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <OnboardingFlow
        role={role}
        initialStep={state.step}
        draft={state.draft}
        languages={LANGUAGES}
        suggestedName={user.name ?? ""}
        timeZones={timeZones()}
      />
    </main>
  );
}
