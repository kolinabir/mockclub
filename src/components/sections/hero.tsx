import Link from "next/link";
import { ArrowUpRight, Globe } from "lucide-react";

import { MemberCard } from "@/components/member-card";
import { Button } from "@/components/ui/button";

const STATS: [string, string][] = [
  ["$0", "forever, for everyone"],
  ["0%", "of sessions run by AI"],
  ["∞", "languages we'll match on"],
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-ink/15">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, var(--ink) 0 1px, transparent 1px 34px), repeating-linear-gradient(90deg, var(--ink) 0 1px, transparent 1px 34px)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-14 lg:py-28">
        <div>
          <p
            className="stamp-label rise mb-6 flex items-center gap-2 text-vermilion-deep sm:mb-7"
            style={{ animationDelay: "40ms" }}
          >
            <Globe className="size-3.5 shrink-0" strokeWidth={2.5} />
            Made by devs, for everyone
          </p>

          <h1
            className="display rise text-[clamp(2.25rem,7vw,5rem)] font-semibold"
            style={{ animationDelay: "120ms" }}
          >
            Practice with someone who has{" "}
            <span className="underline-ink">actually hired</span> people.
          </h1>

          {/* Keyword-bearing subhead: the h1 is the promise, this is the query.
              Emphasis goes on "free" — bolding the competitor's price made the
              eye land on $150–$339, which is the opposite of the point. */}
          <h2
            className="rise mt-7 max-w-xl text-lg leading-relaxed text-ink-soft sm:mt-9"
            style={{ animationDelay: "220ms" }}
          >
            Free mock interviews with real people — any role, any language, your
            timezone. Everywhere else, an hour like this costs $150–$339. Here
            it&apos;s{" "}
            <span className="font-semibold text-ink">free, always</span> —
            because the person across from you is a volunteer, not a vendor.
          </h2>

          <div
            className="rise mt-9 flex flex-col gap-3 sm:mt-10 sm:flex-row"
            style={{ animationDelay: "320ms" }}
          >
            <Button
              asChild
              size="lg"
              className="press press-hover h-13 rounded-none bg-vermilion-strong px-8 text-base font-medium text-chalk hover:bg-vermilion-strong"
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
            className="rise mt-12 grid max-w-lg grid-cols-3 gap-px border border-ink/15 bg-ink/15 sm:mt-14"
            style={{ animationDelay: "420ms" }}
          >
            {STATS.map(([stat, label]) => (
              <div key={label} className="bg-paper px-3 py-4 sm:px-4 sm:py-5">
                <dt className="display text-2xl font-semibold text-vermilion sm:text-3xl">
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
  );
}
