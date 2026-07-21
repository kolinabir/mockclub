import Link from "next/link";
import { ArrowUpRight, Check, Globe, Minus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StructuredData } from "@/components/structured-data";
import { FAQ } from "@/content/faq";
import { TRACKS } from "@/content/tracks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LanguageMarquee } from "@/components/language-marquee";
import { Logo } from "@/components/logo";
import { MemberCard } from "@/components/member-card";

const STEPS = [
  {
    n: "01",
    title: "Say what you're practising for",
    body: "Pick a track, a level, and the language you want to be interviewed in. Bangla, Spanish, Hindi, Arabic — whatever the real interview will be in.",
  },
  {
    n: "02",
    title: "Book an hour with a real person",
    body: "You see who's actually available in your timezone. One click books it, generates the meeting link, and puts it on both calendars with reminders.",
  },
  {
    n: "03",
    title: "Get feedback you can act on",
    body: "Not a vibe check. A scored rubric, written strengths, concrete gaps, and an honest would-I-pass-you call from someone who runs these interviews for real.",
  },
];

export default function Home() {
  return (
    <>
      <StructuredData />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>

      {/* ── Status bar ─────────────────────────────────────────── */}
      <div className="border-b border-ink/15 bg-ink text-paper">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2 sm:px-8">
          <span className="relative flex size-1.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-vermilion opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-vermilion" />
          </span>
          <p className="stamp-label truncate">
            Phase 01 — Gathering interviewers · Booking opens when the calendar
            is full enough
          </p>
        </div>
      </div>

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-ink/15 bg-paper/85 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <Logo className="size-8 shrink-0 text-ink transition-transform group-hover:-rotate-6" />
            <span className="display text-2xl font-semibold tracking-tight">
              MockClub
            </span>
            <span className="stamp-label hidden text-ink-soft sm:inline">
              est. 2026
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {[
              ["How it works", "#how"],
              ["Tracks", "#tracks"],
              ["Volunteer", "#volunteer"],
              ["FAQ", "#faq"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="stamp-label text-ink-soft transition-colors hover:text-vermilion"
              >
                {label}
              </Link>
            ))}
          </div>

          <Button
            asChild
            className="rounded-none border-[1.5px] border-ink bg-ink font-medium text-paper shadow-[3px_3px_0_0_var(--vermilion)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-ink hover:shadow-[5px_5px_0_0_var(--vermilion)]"
          >
            <Link href="#join">Get an invite</Link>
          </Button>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-ink/15">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, var(--ink) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 34px)",
            }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
            <div>
              <p
                className="stamp-label rise mb-7 flex items-center gap-2 text-vermilion"
                style={{ animationDelay: "40ms" }}
              >
                <Globe className="size-3.5" strokeWidth={2.5} />
                Made by devs, for everyone · every timezone · every language
              </p>

              <h1
                className="display rise text-[clamp(2.75rem,5.6vw,5rem)] font-semibold"
                style={{ animationDelay: "120ms" }}
              >
                Practice with
                <br />
                someone who has
                <br />
                <span className="underline-ink">actually hired</span> people.
              </h1>

              <p
                className="rise mt-9 max-w-xl text-lg leading-relaxed text-ink-soft"
                style={{ animationDelay: "220ms" }}
              >
                Mock interviews cost{" "}
                <span className="font-semibold text-ink">$150–$339 an hour</span>{" "}
                everywhere else. Here they cost nothing, because the person on
                the other side is a working professional volunteering an hour —
                the way someone once did for them.
              </p>

              <div
                className="rise mt-10 flex flex-col gap-3 sm:flex-row"
                style={{ animationDelay: "320ms" }}
              >
                <Button
                  asChild
                  size="lg"
                  className="press press-hover h-13 rounded-none bg-vermilion px-8 text-base font-medium text-white hover:bg-vermilion"
                >
                  <Link href="#join">
                    Join the club
                    <ArrowUpRight className="size-4" strokeWidth={2.5} />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="press press-hover h-13 rounded-none border-ink bg-transparent px-8 text-base font-medium hover:bg-transparent"
                >
                  <Link href="#volunteer">I&apos;ll give an hour</Link>
                </Button>
              </div>

              <dl
                className="rise mt-14 grid max-w-lg grid-cols-3 gap-px border border-ink/15 bg-ink/15"
                style={{ animationDelay: "420ms" }}
              >
                {[
                  ["$0", "forever, for everyone"],
                  ["0%", "of sessions run by AI"],
                  ["∞", "languages we'll match on"],
                ].map(([stat, label]) => (
                  <div key={label} className="bg-paper px-4 py-5">
                    <dt className="display text-3xl font-semibold text-vermilion">
                      {stat}
                    </dt>
                    <dd className="stamp-label mt-2 leading-relaxed text-ink-soft">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <MemberCard />
          </div>
        </section>

        <LanguageMarquee />

        {/* ── The gap ──────────────────────────────────────────── */}
        <section className="border-b border-ink/15">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="stamp-label text-vermilion">§ 01 — The problem</p>
                <h2 className="display mt-5 text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold">
                  Good practice is priced like a luxury.
                </h2>
                <p className="mt-7 text-lg leading-relaxed text-ink-soft">
                  For a junior developer in Dhaka, Lagos, or Manila, one session
                  on a mainstream platform can cost close to a month of salary.
                  So the people who need the practice most are precisely the
                  people who cannot buy it.
                </p>
                <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                  Meanwhile thousands of us who already work in the industry
                  would happily give an hour — we just never had a decent way to
                  be found.
                </p>
              </div>

              {/* self-start: otherwise the grid stretches the card and leaves
                  a dead strip under the final row */}
              <div className="press self-start bg-card">
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-ink/15 px-6 py-4">
                  <p className="stamp-label text-ink-soft">
                    What an hour costs elsewhere
                  </p>
                  <p className="stamp-label text-ink-soft">Per session</p>
                </div>
                {[
                  ["Expert marketplaces", "$179 – $339"],
                  ["Ex-FAANG coaching", "$119 – $250"],
                  ["Current-employee mocks", "$100 – $300"],
                  ["Peer platforms (free tier)", "5 / month, then paid"],
                ].map(([label, price]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-ink/10 px-6 py-4"
                  >
                    <span className="flex items-center gap-3 text-ink-soft">
                      <Minus
                        className="size-3.5 shrink-0 text-ink/30"
                        strokeWidth={3}
                      />
                      {label}
                    </span>
                    <span className="font-medium tabular-nums">{price}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] items-center gap-4 bg-ink px-6 py-6 text-paper">
                  <span className="flex items-center gap-3 font-medium">
                    <Check
                      className="size-4 shrink-0 text-vermilion"
                      strokeWidth={3}
                    />
                    MockClub
                  </span>
                  <span className="display text-3xl font-semibold text-vermilion">
                    Free
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section id="how" className="scroll-mt-20 border-b border-ink/15">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <p className="stamp-label text-vermilion">§ 02 — How it works</p>
            <h2 className="display mt-5 max-w-3xl text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold">
              Three steps. No account fees, no upsell, no bot.
            </h2>

            <div className="mt-16 grid gap-px border border-ink/15 bg-ink/15 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="group relative bg-paper p-8 transition-colors hover:bg-card lg:p-10"
                >
                  <span className="display block text-7xl font-semibold text-ink/10 transition-colors group-hover:text-vermilion/25">
                    {step.n}
                  </span>
                  <h3 className="display mt-6 text-2xl font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-4 leading-relaxed text-ink-soft">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Tracks ───────────────────────────────────────────── */}
        <section id="tracks" className="scroll-mt-20 border-b border-ink/15">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="stamp-label text-vermilion">§ 03 — Tracks</p>
                <h2 className="display mt-5 max-w-2xl text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold">
                  It was never only for developers.
                </h2>
              </div>
              <p className="max-w-sm leading-relaxed text-ink-soft">
                Founders rehearse the pitch. Marketers defend the strategy.
                Designers walk the portfolio. Same club, different rubric.
              </p>
            </div>

            <div className="mt-16 grid gap-px border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-3">
              {TRACKS.map((track, i) => (
                <div
                  key={track.name}
                  className="group flex items-start justify-between gap-4 bg-paper p-8 transition-colors hover:bg-card"
                >
                  <div>
                    <span className="stamp-label text-ink/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="display mt-3 text-2xl font-semibold">
                      {track.name}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {track.note}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-5 shrink-0 text-ink/20 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-vermilion"
                    strokeWidth={2}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Volunteer ────────────────────────────────────────── */}
        <section
          id="volunteer"
          className="scroll-mt-20 border-b border-ink/15 bg-ink text-paper"
        >
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <p className="stamp-label text-vermilion">§ 04 — For volunteers</p>
              <h2 className="display mt-5 text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold">
                One hour. That&apos;s the whole ask.
              </h2>
              <p className="mt-7 max-w-lg text-lg leading-relaxed text-paper/70">
                You set your own capacity — one session a month is genuinely
                useful. We hand you a levelled question pack and a scoring
                rubric, so you spend zero minutes preparing and exactly sixty
                minutes helping.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-10 h-13 rounded-none border-[1.5px] border-paper bg-paper px-8 text-base font-medium text-ink shadow-[5px_5px_0_0_var(--vermilion)] transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:bg-paper hover:shadow-[9px_9px_0_0_var(--vermilion)]"
              >
                <Link href="#join">
                  Apply to interview
                  <ArrowUpRight className="size-4" strokeWidth={2.5} />
                </Link>
              </Button>
            </div>

            <ul className="grid gap-px bg-paper/20">
              {[
                [
                  "You keep control of your calendar",
                  "Set weekly hours in your own timezone. Cap how many sessions you take. Pause any time, no explanation needed.",
                ],
                [
                  "Zero prep required",
                  "Question packs by track and level, with the signals to listen for. Open it two minutes before the call.",
                ],
                [
                  "Your time is protected",
                  "Candidates who no-show lose booking privileges. We would rather lose a candidate than waste your hour.",
                ],
                [
                  "Recognition, not payment",
                  "A public profile, a sessions-given count, and a badge worth putting on LinkedIn. Nobody here is paid — that is the point.",
                ],
              ].map(([title, body]) => (
                <li key={title} className="bg-ink p-7">
                  <h3 className="display text-xl font-semibold">{title}</h3>
                  <p className="mt-2.5 leading-relaxed text-paper/60">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-20 border-b border-ink/15">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
            <div>
              <p className="stamp-label text-vermilion">§ 05 — Questions</p>
              <h2 className="display mt-5 text-[clamp(2.25rem,4.5vw,3.75rem)] font-semibold">
                The ones everybody asks.
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {FAQ.map((item) => (
                <AccordionItem
                  key={item.q}
                  value={item.q}
                  className="border-ink/15"
                >
                  <AccordionTrigger className="py-6 text-left font-body text-lg font-medium hover:text-vermilion hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-7 text-base leading-relaxed text-ink-soft">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── Join ─────────────────────────────────────────────── */}
        <section id="join" className="scroll-mt-20">
          <div className="mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 lg:py-32">
            <p className="stamp-label text-vermilion">
              § 06 — Membership is open
            </p>
            <h2 className="display mt-6 text-[clamp(2.5rem,6.5vw,5rem)] font-semibold">
              The club is being built
              <br />
              in the open.
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-ink-soft">
              We are gathering interviewers first. Put your name down and you
              will be in the first group invited the moment there are enough
              volunteers to fill a calendar — and not a day sooner, because an
              empty booking page helps nobody.
            </p>

            <form className="mx-auto mt-11 flex max-w-lg flex-col gap-3 sm:flex-row">
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="h-13 flex-1 rounded-none border-[1.5px] border-ink bg-paper px-4 text-base outline-none transition-shadow placeholder:text-ink/35 focus-visible:shadow-[4px_4px_0_0_var(--vermilion)]"
              />
              <Button
                type="submit"
                size="lg"
                className="press press-hover h-13 rounded-none bg-ink px-8 text-base font-medium text-paper hover:bg-ink"
              >
                Reserve my seat
              </Button>
            </form>
            <p className="stamp-label mt-5 text-ink-soft">
              No spam · No card · No catch
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="rule-thick bg-ink text-paper">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-10">
            <div className="max-w-sm">
              <p className="flex items-center gap-3">
                <Logo className="size-10 shrink-0 text-paper" />
                <span className="display text-3xl font-semibold">MockClub</span>
              </p>
              <p className="display mt-3 text-2xl font-semibold text-vermilion">
                Made by devs, for everyone.
              </p>
              <p className="mt-4 leading-relaxed text-paper/60">
                A volunteer-run practice club. Free forever, run by people who
                remember what it was like to be starting out.
              </p>
            </div>

            <div className="flex flex-wrap gap-14">
              <div>
                <p className="stamp-label text-paper/40">Club</p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    ["How it works", "#how"],
                    ["Tracks", "#tracks"],
                    ["Volunteer", "#volunteer"],
                    ["FAQ", "#faq"],
                  ].map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="text-paper/70 transition-colors hover:text-vermilion"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="stamp-label text-paper/40">Principles</p>
                <ul className="mt-4 space-y-2.5 text-paper/70">
                  <li>Always free</li>
                  <li>Humans only</li>
                  <li>Open source</li>
                  <li>Never for sale</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-paper/15 pt-7">
            <p className="stamp-label text-paper/40">
              © {new Date().getFullYear()} MockClub — built by volunteers
            </p>
            <p className="stamp-label text-paper/40">
              Never a business. Not now, not later.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
