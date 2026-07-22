import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarClock, CircleUser } from "lucide-react";

import { AvailabilityForm } from "@/components/dashboard/availability-form";
import { BecomeInterviewer } from "@/components/dashboard/become-interviewer";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { TRACKS } from "@/content/tracks";
import { getCurrentUser } from "@/lib/session";
import { getAvailability, getSettings } from "@/server/availability/availability";
import { countInterviewers, getProfile, LANGUAGES } from "@/server/profile/profile";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // The security boundary — in the code that reads data, not middleware.
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [profile, interviewers] = await Promise.all([
    getProfile(user.id),
    countInterviewers(),
  ]);

  const [rules, settings] = user.isInterviewer
    ? await Promise.all([getAvailability(user.id), getSettings(user.id)])
    : [[], null];

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="stamp-label text-vermilion-deep">Your dashboard</p>
          <h1 className="display mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold">
            Hello, {firstName}.
          </h1>
          <p className="mt-3 text-ink-soft">
            {user.isInterviewer
              ? "You're set up to practise and to give an hour."
              : "You're set up to practise."}
          </p>

          {/* ── Profile ───────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="display flex items-center gap-3 text-2xl font-semibold">
              <CircleUser className="size-5 text-vermilion-deep" strokeWidth={2} />
              Your profile
            </h2>
            <p className="mt-2 text-ink-soft">
              This is what we match on — role, level, language and timezone.
            </p>

            {!profile && (
              <p className="press mt-5 bg-card p-4 text-sm font-medium">
                Finish this first — matching can&apos;t work without it.
              </p>
            )}

            <div className="mt-6">
              <ProfileForm
                tracks={TRACKS.map((t) => ({ slug: t.slug, name: t.name }))}
                languages={LANGUAGES}
                initial={profile}
              />
            </div>
          </section>

          {/* ── Interviewer ───────────────────────────────────── */}
          {user.isInterviewer ? (
            <section className="mt-16 border-t border-ink/15 pt-12">
              <h2 className="display flex items-center gap-3 text-2xl font-semibold">
                <CalendarClock className="size-5 text-vermilion-deep" strokeWidth={2} />
                When you&apos;re free
              </h2>
              <p className="mt-2 text-ink-soft">
                Nobody can book you yet — this is ready for when booking opens.
              </p>

              <div className="mt-6">
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
            </section>
          ) : (
            <section className="mt-16 border-t border-ink/15 pt-12">
              <div className="press bg-panel p-7 text-panel-fg sm:p-9">
                <h2 className="display text-2xl font-semibold">
                  Someone once gave you an hour.
                </h2>
                <p className="mt-3 max-w-lg leading-relaxed text-panel-fg/80">
                  We have {interviewers} {interviewers === 1 ? "person" : "people"}{" "}
                  volunteering so far, and far more who want to practise. If you have
                  done this job, one hour a month genuinely moves the queue.
                </p>
                <div className="mt-6">
                  <BecomeInterviewer />
                </div>
              </div>
            </section>
          )}

          {/* ── Status ────────────────────────────────────────── */}
          <section className="mt-16 border-t border-ink/15 pt-12">
            <h2 className="display text-2xl font-semibold">Booking</h2>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
              Booking opens once enough interviewers have joined — currently{" "}
              <span className="font-semibold text-ink">{interviewers}</span>. We would
              rather keep you waiting than hand you an empty calendar.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
