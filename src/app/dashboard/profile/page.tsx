import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DisplayName } from "@/components/dashboard/display-name";
import { InterviewerPhoto } from "@/components/dashboard/interviewer-photo";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { TRACKS } from "@/content/tracks";
import { getCurrentUser } from "@/lib/session";
import { getProfile, LANGUAGES } from "@/server/profile/profile";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(user.id);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="stamp-label text-vermilion-deep">Profile</p>
      <h1 className="display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold">
        How we match you.
      </h1>
      <p className="mt-3 text-ink-soft">
        Your name, role, level, experience and the skills you can assess — plus
        where people can find you. Filled in from onboarding; change it any
        time. Everything here is what your{" "}
        <Link
          href="/dashboard/card"
          className="font-medium text-ink underline-offset-4 hover:underline"
        >
          card
        </Link>{" "}
        is printed from.
      </p>

      <div className="mt-8 space-y-5">
        {/* Google supplied this at sign-up; here is the only place it can be
            corrected, and it's the first line on the card. */}
        <DisplayName initialName={user.name} />

        {/* Interviewers only — a candidate's face isn't what a match turns on,
            and asking for one would collect a photo we have no use for. */}
        {user.isInterviewer && (
          <InterviewerPhoto
            initialKey={profile?.photo?.key}
            name={user.name}
          />
        )}

        <ProfileForm
          tracks={TRACKS.map((t) => ({ slug: t.slug, name: t.name }))}
          languages={LANGUAGES}
          initial={profile}
        />
      </div>
    </div>
  );
}
