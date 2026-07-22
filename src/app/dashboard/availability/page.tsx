import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AvailabilityForm } from "@/components/dashboard/availability-form";
import { isoDateIn } from "@/lib/time";
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

  // The PROFILE owns the zone — it's the field a member actually edits. The
  // schedule's copy mirrors it (syncTimeZone), so showing anything else here
  // would just be a stale second opinion.
  const timeZone = profile?.timeZone ?? availability.timeZone;

  // "Today" in the member's own zone, not the server's — it's the floor for a
  // new date override, and off by a day for anyone far enough east or west.
  const today = isoDateIn(new Date(), timeZone);

  // Both kinds are loaded and both are sent back on save. The form replaces the
  // whole rule set, so anything not handed to it would be silently deleted.
  const initialBlocks = availability.rules
    .filter((r) => !r.date)
    .map((r) => ({
      days: r.days,
      startTime: r.startTime,
      endTime: r.endTime,
    }));

  const initialOverrides = availability.rules
    .filter((r): r is typeof r & { date: string } => Boolean(r.date))
    // Spent dates are dropped rather than shown: they can't be edited (the
    // picker floors at today) and re-saving them would just regenerate rules
    // for days that have already passed.
    .filter((r) => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: r.date,
      blocked: r.blocked,
      startTime: r.startTime,
      endTime: r.endTime,
    }));

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
          initialBlocks={initialBlocks}
          initialOverrides={initialOverrides}
          timeZone={timeZone}
          today={today}
          initialMax={settings?.maxSessionsPerMonth ?? 2}
          initialPaused={settings?.paused ?? false}
        />
      </div>
    </div>
  );
}
