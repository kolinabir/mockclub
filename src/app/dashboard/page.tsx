import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, PauseCircle } from "lucide-react";

import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/server/availability/availability";
import { countWaitingCandidates } from "@/server/onboarding/onboarding";
import {
  countInterviewers,
  getProfile,
  profileChecklist,
  type ChecklistItem,
} from "@/server/profile/profile";
import {
  countOpenSlots,
  getAvailability,
  nextOpenSlot,
} from "@/server/scheduling/scheduling";

export const metadata: Metadata = {
  title: "Overview",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Mon & Thu, 18:00–20:00" — the week as a sentence, not a table. */
function describeWeek(
  rules: { days: number[]; startTime: string; endTime: string; date: string | null }[],
): string[] {
  return rules
    .filter((r) => !r.date && r.days.length > 0)
    .map((r) => {
      const days = [...r.days].sort().map((d) => DAY_LABELS[d]);
      const list =
        days.length === 1
          ? days[0]
          : `${days.slice(0, -1).join(", ")} & ${days[days.length - 1]}`;
      return `${list}, ${r.startTime}–${r.endTime}`;
    });
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;

  return (
    <section className="press mt-4 bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="stamp-label text-ink-soft">Your profile</p>
        <p className="text-sm text-ink-soft tabular-nums">
          {done} of {items.length} done
        </p>
      </div>

      {/* Progress as a hard bar — no rounded corners anywhere in this design. */}
      <div
        className="mt-3 h-1.5 w-full bg-paper-deep"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-label="Profile completeness"
      >
        <div
          className="h-full bg-vermilion"
          style={{ inlineSize: `${(done / items.length) * 100}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-2.5 text-sm">
            {item.done ? (
              <Check
                className="size-4 shrink-0 text-olive"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <span
                className="size-4 shrink-0 border-[1.5px] border-ink/30"
                aria-hidden
              />
            )}
            <span className={item.done ? "text-ink-soft line-through" : ""}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/profile"
        className="press press-hover mt-5 inline-flex min-h-11 items-center gap-2 bg-paper px-4 text-sm font-medium transition-all"
      >
        Finish your profile
        <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
      </Link>
    </section>
  );
}

/**
 * Why booking is closed, said plainly.
 *
 * The interviewer count on its own is a statistic about the platform and
 * identical for every viewer. Paired with the number waiting, it becomes the
 * honest answer to "why can't I book yet?" — and the argument for volunteering.
 */
function SupplyLine({
  interviewers,
  waiting,
}: {
  interviewers: number;
  waiting: number;
}) {
  return (
    <section className="mt-10 border-t border-ink/15 pt-6">
      <p className="stamp-label text-ink-soft">Why booking is closed</p>
      <p className="mt-3 max-w-xl leading-relaxed">
        <span className="font-semibold tabular-nums">{interviewers}</span>{" "}
        {interviewers === 1 ? "person is" : "people are"} volunteering to
        interview, and{" "}
        <span className="font-semibold tabular-nums">{waiting}</span>{" "}
        {waiting === 1 ? "is" : "are"} waiting to practise. Booking opens when
        that gap closes — we would rather keep you waiting than hand you an
        empty calendar.
      </p>
    </section>
  );
}

export default async function DashboardOverview() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [profile, interviewers, waiting] = await Promise.all([
    getProfile(user.id),
    countInterviewers(),
    countWaitingCandidates(),
  ]);

  // An admin who skipped onboarding has no member profile, so this overview
  // would greet them with a checklist for an account they never signed up for.
  // Send them where they were going. Keyed on the profile we already fetched,
  // so it costs no extra query — and an admin who DID onboard as a member keeps
  // the normal dashboard.
  if (user.isAdmin && !profile) redirect("/dashboard/admin");

  const firstName = user.name?.split(" ")[0] ?? "there";
  const role = user.isInterviewer ? "interviewer" : "candidate";
  const checklist = profileChecklist(profile, role);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="stamp-label text-vermilion-deep">Overview</p>
      <h1 className="display mt-3 text-[clamp(1.875rem,4.5vw,3rem)] font-semibold">
        Hello, {firstName}.
      </h1>

      {user.isInterviewer ? (
        <InterviewerView
          userId={user.id}
          checklist={checklist}
          hasProfile={Boolean(profile)}
          interviewers={interviewers}
          waiting={waiting}
        />
      ) : (
        <CandidateView
          checklist={checklist}
          interviewers={interviewers}
          waiting={waiting}
        />
      )}
    </div>
  );
}

async function InterviewerView({
  userId,
  checklist,
  hasProfile,
  interviewers,
  waiting,
}: {
  userId: string;
  checklist: ChecklistItem[];
  hasProfile: boolean;
  interviewers: number;
  waiting: number;
}) {
  const [openSlots, next, availability, settings] = await Promise.all([
    countOpenSlots(userId),
    nextOpenSlot(userId),
    getAvailability(userId),
    getSettings(userId),
  ]);

  const paused = settings?.paused ?? false;
  const week = describeWeek(availability.rules);
  const profileDone = checklist.every((i) => i.done);

  // One verdict, in priority order — the first unmet condition is the one
  // worth acting on, so there is never more than one call to action.
  const verdict = paused
    ? { state: "paused" as const, title: "You're paused." }
    : !hasProfile || !profileDone
      ? {
          state: "blocked" as const,
          title: "Not bookable yet.",
          because: "Your profile isn't finished — matching needs it.",
          href: "/dashboard/profile",
          cta: "Finish your profile",
        }
      : openSlots === 0
        ? {
            state: "blocked" as const,
            title: "Not bookable yet.",
            because: "You haven't set any hours, so there's nothing to book.",
            href: "/dashboard/availability",
            cta: "Set your hours",
          }
        : { state: "listed" as const, title: "You're listed." };

  return (
    <>
      {verdict.state === "listed" && (
        <section className="press mt-8 bg-panel p-6 text-panel-fg sm:p-8">
          <p className="stamp-label text-vermilion-light">Status</p>
          <h2 className="display mt-2 text-[clamp(1.5rem,4vw,2rem)] font-semibold">
            {verdict.title}
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-panel-fg/80">
            Your hours are prepared and waiting. Nobody can book them until
            booking opens — nothing more is needed from you until then.
          </p>
        </section>
      )}

      {verdict.state === "blocked" && (
        <section className="press mt-8 bg-card p-6 sm:p-8">
          <p className="stamp-label text-vermilion-deep">Status</p>
          <h2 className="display mt-2 text-[clamp(1.5rem,4vw,2rem)] font-semibold">
            {verdict.title}
          </h2>
          <p className="mt-3 max-w-lg leading-relaxed text-ink-soft">
            {verdict.because}
          </p>
          <Link
            href={verdict.href}
            className="press press-hover mt-5 inline-flex min-h-11 items-center gap-2 bg-vermilion-strong px-5 text-sm font-medium text-chalk transition-all"
          >
            {verdict.cta}
            <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
          </Link>
        </section>
      )}

      {verdict.state === "paused" && (
        <section className="press mt-8 flex flex-col gap-4 bg-card p-6 sm:flex-row sm:items-center sm:p-8">
          <PauseCircle
            className="size-8 shrink-0 text-vermilion-deep"
            strokeWidth={1.75}
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="display text-[clamp(1.375rem,4vw,1.75rem)] font-semibold">
              You&apos;re paused.
            </h2>
            <p className="mt-2 leading-relaxed text-ink-soft">
              Your hours are kept exactly as they are — nobody can book you
              until you turn this off.{" "}
              <Link
                href="/dashboard/availability"
                className="font-medium text-ink underline-offset-4 hover:underline"
              >
                Unpause
              </Link>
            </p>
          </div>
        </section>
      )}

      <section className="mt-4 grid items-start gap-4 sm:grid-cols-2">
        <div className="press bg-card p-5">
          <p className="stamp-label text-ink-soft">Bookable hours</p>
          <p className="display mt-2 text-4xl font-semibold tabular-nums">
            {openSlots}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            prepared over the next four weeks.
          </p>
        </div>

        <div className="press bg-card p-5">
          <p className="stamp-label text-ink-soft">Next free hour</p>
          {next ? (
            <>
              <p className="display mt-2 text-2xl font-semibold leading-tight">
                {new Intl.DateTimeFormat(undefined, {
                  timeZone: availability.timeZone,
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }).format(next)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                in {availability.timeZone}.
              </p>
            </>
          ) : (
            <>
              <p className="display mt-2 text-2xl font-semibold leading-tight">
                None
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Add hours and they&apos;ll appear here.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="press mt-4 bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="stamp-label text-ink-soft">Your week</p>
          <Link
            href="/dashboard/availability"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Edit
          </Link>
        </div>
        {week.length ? (
          <ul className="mt-3 space-y-1.5">
            {week.map((line, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            No repeating hours yet.
          </p>
        )}
      </section>

      <Checklist items={checklist} />
      <SupplyLine interviewers={interviewers} waiting={waiting} />
    </>
  );
}

function CandidateView({
  checklist,
  interviewers,
  waiting,
}: {
  checklist: ChecklistItem[];
  interviewers: number;
  waiting: number;
}) {
  const profileDone = checklist.every((i) => i.done);

  return (
    <>
      <section className="press mt-8 bg-card p-6 sm:p-8">
        <p className="stamp-label text-vermilion-deep">Status</p>
        <h2 className="display mt-2 text-[clamp(1.5rem,4vw,2rem)] font-semibold">
          {profileDone ? "You're on the list." : "Almost there."}
        </h2>
        <p className="mt-3 max-w-lg leading-relaxed text-ink-soft">
          {profileDone
            ? "Nothing else is needed from you. When booking opens you'll be able to pick an interviewer and a time."
            : "Finish your profile and you're done — matching can't pair you without it."}
        </p>
      </section>

      <Checklist items={checklist} />
      <SupplyLine interviewers={interviewers} waiting={waiting} />
    </>
  );
}
