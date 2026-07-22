import { Check, Minus } from "lucide-react";

import { Reveal } from "@/components/reveal";

const ROWS: [string, string][] = [
  ["Expert marketplaces", "$179 – $339"],
  ["Ex-FAANG coaching", "$119 – $250"],
  ["Current-employee mocks", "$100 – $300"],
  ["Peer platforms (free tier)", "5 / month, then paid"],
];

export function TheGap() {
  return (
    <section id="gap" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <Reveal>
            <p className="stamp-label text-vermilion-deep">
              § 01 — The problem
            </p>
            <h2 className="display mt-5 text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
              Good practice is priced like a luxury.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft sm:mt-7">
              For a junior developer in Dhaka, Lagos, or Manila, one session on
              a mainstream platform can cost close to a month of salary. So the
              people who need the practice most are precisely the people who
              cannot buy it.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Meanwhile thousands of us who already work in the industry would
              happily give an hour — we just never had a decent way to be found.
            </p>
          </Reveal>

          {/* self-start: the grid would otherwise stretch the card and leave a
              dead strip under the final row */}
          <Reveal delay={120} className="press self-start bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-ink/15 px-5 py-4 sm:px-6">
              <p className="stamp-label text-ink-soft">
                What an hour costs elsewhere
              </p>
              <p className="stamp-label hidden text-ink-soft sm:block">
                Per session
              </p>
            </div>

            {ROWS.map(([label, price]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-ink/10 px-5 py-4 sm:px-6"
              >
                <span className="flex items-center gap-3 text-ink-soft">
                  <Minus
                    className="size-3.5 shrink-0 text-ink-soft"
                    strokeWidth={3}
                  />
                  {label}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {price}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between gap-4 bg-panel px-5 py-5 text-panel-fg sm:px-6 sm:py-6">
              <span className="flex items-center gap-3 font-medium">
                <Check
                  className="size-4 shrink-0 text-vermilion"
                  strokeWidth={3}
                />
                MockClub
              </span>
              <span className="display text-3xl font-semibold text-vermilion-light">
                Free
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
