import Link from "next/link";
import { ArrowUpRight, Clock, Globe, Layers } from "lucide-react";

import { InterviewerCard } from "@/components/interviewer-card";
import { Reveal } from "@/components/reveal";
import { zoneLabel } from "@/lib/time";
import type { PublicInterviewer } from "@/server/profile/public";

/**
 * An interviewer's public page, as markup.
 *
 * Split from the route so the route stays thin (AGENTS.md) — it fetches, gates
 * and 404s, and nothing about how this looks is tangled up with who is allowed
 * to see it. It also means the design can be rendered from a fixture.
 *
 * Written as a CREDENTIAL, not a shop window. Nobody browses a list and picks
 * an interviewer here — matching does that — so the page answers one question
 * for whoever was sent the link: who is this person, and what can they actually
 * assess? Everything on it is something the member typed about their own
 * working life, and the card is the anchor.
 */

const LINK_LABELS: Record<string, string> = {
  website: "Website",
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  other: "Link",
};

/** A stamped caption over a value — the record style used across the site. */
function Fact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
}) {
  return (
    <div className="border-[1.5px] border-ink/15 bg-card p-5">
      <p className="stamp-label flex items-center gap-2 text-[0.625rem] text-ink-soft">
        <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
        {label}
      </p>
      <p className="mt-2.5 font-medium">{value}</p>
    </div>
  );
}

export function InterviewerProfile({ person }: { person: PublicInterviewer }) {
  const { card } = person;
  const experience =
    person.yearsOfExperience === undefined
      ? person.level
      : `${person.level} · ${person.yearsOfExperience} ${
          person.yearsOfExperience === 1 ? "year" : "years"
        }`;

  return (
    <main id="main" className="flex-1">
        {/* ── The person, and the card ──────────────────────────── */}
        <section className="border-b border-ink/15">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
              <Reveal>
                <p className="stamp-label text-vermilion-deep">
                  Interviewer · No. {card.no}
                </p>
                <h1 className="display mt-5 text-[clamp(2.5rem,7vw,4.5rem)] font-semibold">
                  {card.name}
                </h1>
                <p className="mt-4 text-lg text-ink-soft sm:text-xl">
                  {person.headline}
                </p>

                <p className="mt-7 max-w-xl leading-relaxed">
                  Volunteers an hour at a time to run mock interviews for people
                  breaking in — for free, in{" "}
                  {card.languages.join(" and ")}. No AI, no payment, no catch.
                </p>

                {person.links.length > 0 && (
                  <div className="mt-8">
                    <p className="stamp-label text-ink-soft">Find them at</p>
                    <ul className="mt-3 flex flex-wrap gap-2.5">
                      {person.links.map((link) => (
                        <li key={link.url}>
                          <a
                            href={link.url}
                            target="_blank"
                            // noopener is the security half; nofollow is the
                            // honest half — a public page must not become a way
                            // to farm links off this domain.
                            rel="noopener noreferrer nofollow"
                            className="press press-hover inline-flex min-h-11 items-center gap-2 bg-paper px-4 text-sm font-medium transition-all"
                          >
                            {LINK_LABELS[link.type] ?? "Link"}
                            <ArrowUpRight
                              className="size-3.5 rtl:-scale-x-100"
                              strokeWidth={2.5}
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Reveal>

              <Reveal delay={120}>
                <InterviewerCard data={card} className="mx-auto max-w-md" />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── What they can assess ──────────────────────────────── */}
        <section className="border-b border-ink/15">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <Reveal>
              <p className="stamp-label text-vermilion-deep">
                What they can assess
              </p>
              <h2 className="display mt-4 text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold">
                The kind of hour you&apos;d get.
              </h2>
            </Reveal>

            {person.disciplines.length > 0 && (
              <Reveal delay={80}>
                <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {person.disciplines.map((d) => (
                    <li key={d.slug} className="press bg-card p-5">
                      <p className="font-semibold">{d.name}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                        {d.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </Reveal>
            )}

            {person.skills.length > 0 && (
              <Reveal delay={140}>
                <div className="mt-10">
                  <p className="stamp-label text-ink-soft">
                    Specifically ({person.skills.length})
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {person.skills.map((skill) => (
                      <li
                        key={skill}
                        className="border-[1.5px] border-ink/20 px-3 py-1.5 text-sm font-medium"
                      >
                        {skill}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            <Reveal delay={200}>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <Fact label="Experience" value={experience} icon={Layers} />
                <Fact
                  label="Interviews in"
                  value={card.languages.join(", ")}
                  icon={Globe}
                />
                <Fact
                  label="Local time"
                  value={zoneLabel(card.timeZone)}
                  icon={Clock}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── The club, and the way in ──────────────────────────── */}
        {/* The site footer is dark too, so without this hairline the page ends
            in one undifferentiated slab. */}
        <section className="border-b border-panel-fg/15 bg-panel text-panel-fg">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
            <Reveal>
              <p className="stamp-label text-vermilion-light">
                Real humans, never AI
              </p>
              <h2 className="display mt-4 max-w-2xl text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold">
                You can&apos;t book {card.name.split(" ")[0]} yet.
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-panel-fg/80">
                Booking opens when there are enough volunteers to go round — we
                would rather keep you waiting than hand you an empty calendar.
                Join the list and you&apos;ll be matched with someone like them.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-in"
                  className="press press-hover inline-flex min-h-12 items-center gap-2 bg-vermilion-strong px-6 font-medium text-chalk transition-all"
                >
                  Join the club
                  <ArrowUpRight
                    className="size-4 rtl:-scale-x-100"
                    strokeWidth={2.5}
                  />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-12 items-center gap-2 border-[1.5px] border-panel-fg/40 px-6 font-medium transition-colors hover:border-panel-fg"
                >
                  Why it&apos;s free
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
    </main>
  );
}
