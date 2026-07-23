import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
        Role, level, experience and the skills you can assess — plus where
        people can find you. Filled in from onboarding; change it any time.
      </p>

      <div className="mt-8">
        <ProfileForm
          tracks={TRACKS.map((t) => ({ slug: t.slug, name: t.name }))}
          languages={LANGUAGES}
          initial={profile}
        />
      </div>
    </div>
  );
}
