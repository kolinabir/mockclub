import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Check, Download, Lock } from "lucide-react";

import { BecomeInterviewer } from "@/components/dashboard/become-interviewer";
import { PublishCard } from "@/components/dashboard/publish-card";
import { InterviewerCard } from "@/components/interviewer-card";
import { getCurrentUser } from "@/lib/session";
import { SITE_URL } from "@/lib/site";
import { buildCard, type CardRequirement } from "@/server/profile/card";
import { getProfile } from "@/server/profile/profile";
import { visibilityOf } from "@/server/profile/public";

/**
 * Your card.
 *
 * The card is made of the profile — there is nothing to fill in here. So the
 * page has exactly two states: the printed card, or the same card blurred
 * behind the list of what is still missing. No third "empty" state, because an
 * outline of the thing you don't have yet is a better ask than a blank page.
 */

export const metadata: Metadata = {
  title: "Card",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

function Requirements({
  items,
  isInterviewer,
}: {
  items: CardRequirement[];
  isInterviewer: boolean;
}) {
  const done = items.filter((i) => i.done).length;

  return (
    <div className="press w-full max-w-md bg-paper p-6 sm:p-7">
      <div className="flex items-center gap-2.5">
        <Lock className="size-4 shrink-0 text-vermilion-deep" strokeWidth={2.5} aria-hidden />
        <p className="stamp-label text-vermilion-deep">Not printed yet</p>
      </div>

      <h2 className="display mt-3 text-[clamp(1.375rem,4vw,1.75rem)] font-semibold">
        {isInterviewer
          ? "Your card is waiting on you."
          : "Cards are for the people who give the hours."}
      </h2>

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        {isInterviewer
          ? "Every line on a card comes from your profile. Fill in the rest and it prints itself — nothing to design, nothing to submit."
          : "A card says who a candidate is about to spend an hour with. Volunteer to interview and yours starts printing from your profile."}
      </p>

      <p className="mt-5 text-sm text-ink-soft tabular-nums">
        {done} of {items.length} done
      </p>
      <div
        className="mt-2 h-1.5 w-full bg-paper-deep"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-label="Card completeness"
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
              <Check className="size-4 shrink-0 text-olive" strokeWidth={2.5} aria-hidden />
            ) : (
              <span className="size-4 shrink-0 border-[1.5px] border-ink/30" aria-hidden />
            )}
            <span className={item.done ? "text-ink-soft line-through" : ""}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isInterviewer ? (
          <Link
            href="/dashboard/profile"
            className="press press-hover inline-flex min-h-11 items-center gap-2 bg-vermilion-strong px-5 text-sm font-medium text-chalk transition-all"
          >
            Finish your profile
            <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
          </Link>
        ) : (
          <BecomeInterviewer />
        )}
      </div>
    </div>
  );
}

export default async function CardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const profile = await getProfile(user.id);
  const { ready, requirements, data } = buildCard(user, profile);
  const visibility = visibilityOf(user, profile);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="stamp-label text-vermilion-deep">Card</p>
      <h1 className="display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold">
        {ready ? "This is you, on paper." : "One card, once it's earned."}
      </h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        {ready
          ? "Printed from your profile. Change anything there and this reprints itself — a card is never edited on its own."
          : "A card is printed from your profile, not filled in here. Everything below has to be true first."}
      </p>

      <div className="mt-10 sm:mt-12">
        {ready ? (
          <div className="mx-auto w-full max-w-lg">
            <InterviewerCard data={data} />

            {/* A plain link, not a button: the response is a file, so letting
                the browser handle the navigation is both simpler and what makes
                "save as" work the way people expect. */}
            <a
              href="/dashboard/card/download"
              download
              className="press press-hover mt-10 inline-flex min-h-11 items-center gap-2 bg-paper px-5 text-sm font-medium transition-all"
            >
              <Download className="size-4" strokeWidth={2.5} />
              Download as PNG
            </a>

            <PublishCard
              isPublic={visibility.isPublic}
              canPublish={visibility.canPublish}
              url={`${SITE_URL}/interviewers/${user.id}`}
            />
          </div>
        ) : (
          // Both children occupy the same grid cell, so the container is as
          // tall as the taller of the two — an absolutely positioned overlay
          // would fall out of the card on a narrow screen.
          <div className="grid">
            <div
              aria-hidden
              className="pointer-events-none col-start-1 row-start-1 mx-auto w-full max-w-lg select-none px-1 opacity-80 blur-[9px] saturate-[0.85]"
            >
              <InterviewerCard data={data} />
            </div>

            {/* `relative` is load-bearing: `blur` gives the layer above a
                stacking context, which paints over any STATIC sibling however
                late it comes in the DOM. Without this the card is drawn on top
                of the panel and the whole screen reads as blurred. */}
            <div className="relative col-start-1 row-start-1 grid place-items-center p-2">
              <Requirements
                items={requirements}
                isInterviewer={user.isInterviewer}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
