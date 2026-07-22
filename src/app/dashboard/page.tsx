import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CircleUser } from "lucide-react";

import { BecomeInterviewer } from "@/components/dashboard/become-interviewer";
import { getCurrentUser } from "@/lib/session";
import { countInterviewers, getProfile } from "@/server/profile/profile";

export const metadata: Metadata = { title: "Overview", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [profile, interviewers] = await Promise.all([
    getProfile(user.id),
    countInterviewers(),
  ]);

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-3xl">
      <p className="stamp-label text-vermilion-deep">Overview</p>
      <h1 className="display mt-3 text-[clamp(1.875rem,4.5vw,3rem)] font-semibold">
        Hello, {firstName}.
      </h1>

      {!profile && (
        <Link
          href="/dashboard/profile"
          className="press press-hover mt-8 flex items-center justify-between gap-4 bg-card p-5 transition-all"
        >
          <span className="flex items-center gap-3">
            <CircleUser className="size-5 shrink-0 text-vermilion-deep" strokeWidth={2} />
            <span>
              <span className="block font-medium">Finish your profile</span>
              <span className="block text-sm text-ink-soft">
                Matching can&apos;t work without it.
              </span>
            </span>
          </span>
          <ArrowUpRight className="size-5 shrink-0 rtl:-scale-x-100" strokeWidth={2.5} />
        </Link>
      )}

      <section className="mt-10">
        <h2 className="display text-2xl font-semibold">Booking</h2>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
          Booking opens once enough interviewers have joined — currently{" "}
          <span className="font-semibold text-ink">{interviewers}</span>. We would
          rather keep you waiting than hand you an empty calendar.
        </p>
      </section>

      {!user.isInterviewer && (
        <section className="press mt-10 bg-panel p-7 text-panel-fg sm:p-9">
          <h2 className="display text-2xl font-semibold">
            Someone once gave you an hour.
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-panel-fg/80">
            We have {interviewers} {interviewers === 1 ? "person" : "people"}{" "}
            volunteering so far, and far more who want to practise. If you have done
            this job, one hour a month genuinely moves the queue.
          </p>
          <div className="mt-6">
            <BecomeInterviewer />
          </div>
        </section>
      )}
    </div>
  );
}
