import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvailabilityForm } from "@/components/dashboard/availability-form";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/server/availability/availability";
import {
  countOpenSlots,
  getAvailability,
} from "@/server/scheduling/scheduling";
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

  const [profile, availability, settings, openSlots] = await Promise.all([
    getProfile(user.id),
    getAvailability(user.id),
    getSettings(user.id),
    countOpenSlots(user.id),
  ]);

  // The schedule owns the scheduling zone (PLAN.md §5); the profile's is only a
  // display default for someone who has never saved a schedule.
  const timeZone =
    availability.rules.length || availability.timeZone !== "UTC"
      ? availability.timeZone
      : (profile?.timeZone ?? "UTC");

  return (
    <div className="mx-auto max-w-2xl">
      <p className="stamp-label text-vermilion-deep">Availability</p>
      <h1 className="display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold">
        When you&apos;re free.
      </h1>
      <p className="mt-3 text-ink-soft">
        Nobody can book you yet — this is ready for when booking opens.
      </p>

      <p className="press mt-5 bg-card p-4 text-sm leading-relaxed">
        {openSlots > 0 ? (
          <>
            <span className="font-semibold">{openSlots}</span> bookable{" "}
            {openSlots === 1 ? "hour" : "hours"} are prepared for the next four
            weeks. They refresh whenever you change your hours.
          </>
        ) : (
          <>
            You have no bookable hours yet. Add at least one window below —
            that&apos;s what makes you appear when booking opens.
          </>
        )}
      </p>

      <div className="mt-8">
        <AvailabilityForm
          initialRules={availability.rules
            .filter((r) => !r.date)
            .map((r) => ({
              days: r.days,
              startTime: r.startTime,
              endTime: r.endTime,
            }))}
          timeZone={timeZone}
          initialMax={settings?.maxSessionsPerMonth ?? 2}
          initialPaused={settings?.paused ?? false}
        />
      </div>
    </div>
  );
}
