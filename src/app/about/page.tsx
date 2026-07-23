import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { StatusBar } from "@/components/sections/status-bar";
import { Button } from "@/components/ui/button";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — who runs MockClub and why it's free",
  description:
    "MockClub is a volunteer-run club where working professionals give an hour to help people practise interviews. No AI, no payments, open source. Here's the story and the promise.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About MockClub",
    description:
      "Who runs MockClub, why it's free forever, and the promise that it will never become a business.",
    url: `${SITE_URL}/about`,
  },
};

const PRINCIPLES: [string, string][] = [
  [
    "Always free",
    "There is no payment code in this product and there never will be — no card, no credits for sale, no premium tier waiting behind a curtain. Free the first time, free every time, for everyone — and that never depends on how many volunteers show up or how big the club gets.",
  ],
  [
    "Humans only",
    "Every session is one person talking to another. We will not add AI interviewers or AI feedback. Plenty of tools already do that; the entire point of this club is that a real person who has done the job gives you their time.",
  ],
  [
    "Open source",
    "The whole platform is public and licensed so it stays that way. Anyone can read it, fork it, translate it, or run it for their own community — and nobody, including us, can quietly turn it into a paid product.",
  ],
  [
    "Never a business",
    "Not now, not later. The founders cover the hosting today; sponsorship and small donations are welcome but optional. The moment money is the point, the thing we built stops being the thing we built.",
  ],
];

export default function AboutPage() {
  return (
    <>
      <StatusBar />
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* ── Intro ─────────────────────────────────────────────── */}
        <section className="border-b border-ink/15">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
            <Reveal>
              <p className="stamp-label text-vermilion-deep">About the club</p>
              <h1 className="display mt-5 text-[clamp(2.25rem,6vw,4.25rem)] font-semibold">
                It started in a group chat.
              </h1>
              <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
                <p>
                  A handful of developers, most of us already working in the
                  industry, kept watching the same thing happen. Good people —
                  people who could clearly do the job — were failing interviews
                  they were qualified for. Not because they lacked the skill,
                  but because nobody had ever put them through the real thing
                  and told them the truth about how it went.
                </p>
                <p>
                  The help that exists is priced like a luxury. A single session
                  on a mainstream platform can run{" "}
                  <span className="font-semibold text-ink">$150 to $339</span> —
                  close to a month of an entry-level salary in a lot of the
                  world. So the people who need the practice most are exactly
                  the people who cannot buy it. That felt backwards.
                </p>
                <p>
                  Meanwhile, thousands of us who sit on the hiring side would
                  happily give an hour. We remember who did it for us. We just
                  never had a decent way to be found. MockClub is the decent
                  way.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Who the interviewers are ──────────────────────────── */}
        <section className="border-b border-ink/15 bg-panel text-panel-fg">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-24">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <p className="stamp-label text-vermilion-light">
                Who runs the sessions
              </p>
              <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.25rem)] font-semibold">
                Real working professionals.
              </h2>
              <ul className="mt-8 space-y-3.5 border-t border-panel-fg/20 pt-6">
                {[
                  "Currently working in their field",
                  "Moderator-reviewed before they appear",
                  "Identity checked — work email or public profile",
                  "Up to three interviewers on a session",
                  "Never paid — they volunteer the hour",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check
                      className="mt-1 size-4 shrink-0 text-vermilion-light"
                      strokeWidth={2.5}
                    />
                    <span className="text-panel-fg/90">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal
              delay={100}
              className="space-y-5 text-lg leading-relaxed text-panel-fg/80"
            >
              <p>
                Every interviewer here currently works in their field and has
                sat on the hiring side of the table — engineers, product
                managers, designers, marketers, data scientists, founders.
                Before anyone appears in search, a moderator reviews their
                application, and most verify who they are — a work email domain,
                or a public profile like LinkedIn, X, or a personal site — so
                you know who you are talking to.
              </p>
              <p>
                They are not paid, and that is the point. What they get instead
                is a public profile, a count of the sessions they have given,
                and a badge worth putting on their own résumé. The currency here
                is recognition and the plain satisfaction of passing on an hour
                that someone once gave them.
              </p>
              <p>
                To protect that goodwill, we cap how many sessions a volunteer
                takes, leave them free to run each session however they see fit
                rather than forcing a script, and hold no-shows accountable on
                both sides. Volunteer time is the scarcest thing this whole club
                has, and we guard it accordingly.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── Principles ────────────────────────────────────────── */}
        <section className="border-b border-ink/15">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-24">
            <Reveal>
              <p className="stamp-label text-vermilion-deep">What we promise</p>
              <h2 className="display mt-5 max-w-2xl text-[clamp(1.875rem,4.5vw,3.25rem)] font-semibold">
                Four lines we will not cross.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2">
              {PRINCIPLES.map(([title, body], i) => (
                <Reveal
                  key={title}
                  delay={(i % 2) * 90}
                  className="bg-paper p-7 sm:p-9"
                >
                  <h3 className="display text-2xl font-semibold">{title}</h3>
                  <p className="mt-3 leading-relaxed text-ink-soft">{body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────── */}
        <section>
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
            <Reveal>
              <h2 className="display text-[clamp(2rem,5vw,3.5rem)] font-semibold">
                Built in the open, by volunteers.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
                Whether you need the practice or you have an hour to give, there
                is a seat for you. Sign in with Google and you are a member —
                interviewers are what we need most.
              </p>
              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="press press-hover h-13 rounded-none bg-vermilion-strong px-8 text-base font-medium text-chalk hover:bg-vermilion-strong"
                >
                  <Link href="/#join">
                    Join the club
                    <ArrowUpRight
                      className="size-4 rtl:-scale-x-100"
                      strokeWidth={2.5}
                    />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="press press-hover h-13 rounded-none border-ink bg-transparent px-8 text-base font-medium hover:bg-transparent"
                >
                  <Link href="/#volunteer">I&apos;ll give an hour</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
