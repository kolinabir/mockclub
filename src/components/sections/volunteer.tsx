import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";

const PERKS: [string, string][] = [
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
];

export function Volunteer() {
  return (
    <section
      id="volunteer"
      className="scroll-mt-20 border-b border-ink/15 bg-ink text-paper"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-28">
        <Reveal>
          <p className="stamp-label text-vermilion-light dark:text-vermilion-strong">§ 04 — For volunteers</p>
          <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
            One hour. That&apos;s the whole ask.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-paper/80 sm:mt-7">
            You set your own capacity — one session a month is genuinely useful.
            We hand you a levelled question pack and a scoring rubric, so you
            spend zero minutes preparing and exactly sixty minutes helping.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-9 h-13 rounded-none border-[1.5px] border-paper bg-paper px-8 text-base font-medium text-ink shadow-[5px_5px_0_0_var(--vermilion)] transition-all hover:translate-x-[-3px] hover:translate-y-[-3px] hover:bg-paper hover:shadow-[9px_9px_0_0_var(--vermilion)] sm:mt-10"
          >
            <Link href="#join">
              Apply to interview
              <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
            </Link>
          </Button>
        </Reveal>

        <ul className="grid gap-px bg-paper/25">
          {PERKS.map(([title, body], i) => (
            <Reveal as="li" key={title} delay={i * 90} className="bg-ink p-6 sm:p-7">
              <h3 className="display text-xl font-semibold">{title}</h3>
              <p className="mt-2.5 leading-relaxed text-paper/75">{body}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
