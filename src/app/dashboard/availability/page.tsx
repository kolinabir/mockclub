import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvailabilityForm } from "@/components/dashboard/availability-form";
import { getCurrentUser } from "@/lib/session";
import {
  getAvailability,
  getSettings,
} from "@/server/availability/availability";
import { getProfile } from "@/server/profile/profile";

export const metadata: Metadata = {
  title: "Availability",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  // Re-checked here, not just hidden in the sidebar — a hidden link is not a guard.
  if (!user.isInterviewer) redirect("/dashboard");

  const [profile, rules, settings] = await Promise.all([
    getProfile(user.id),
    getAvailability(user.id),
    getSettings(user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="stamp-label text-vermilion-deep">Availability</p>
      <h1 className="display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold">
        When you&apos;re free.
      </h1>
      <p className="mt-3 text-ink-soft">
        Nobody can book you yet — this is ready for when booking opens.
      </p>

      <div className="mt-8">
        <AvailabilityForm
          initialRules={rules.map((r) => ({
            days: r.days,
            startTime: r.startTime,
            endTime: r.endTime,
          }))}
          timeZone={profile?.timeZone ?? "UTC"}
          initialMax={settings?.maxSessionsPerMonth ?? 2}
          initialPaused={settings?.paused ?? false}
        />
      </div>
    </div>
  );
}
