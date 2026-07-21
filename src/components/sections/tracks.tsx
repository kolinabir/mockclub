import { ArrowUpRight } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { TRACKS } from "@/content/tracks";

export function Tracks() {
  return (
    <section id="tracks" className="scroll-mt-20 border-b border-ink/15">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20 lg:py-28">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="stamp-label text-vermilion-deep">§ 03 — Tracks</p>
            <h2 className="display mt-5 max-w-2xl text-[clamp(1.875rem,4.5vw,3.75rem)] font-semibold">
              It was never only for developers.
            </h2>
          </div>
          <p className="max-w-sm leading-relaxed text-ink-soft">
            Founders rehearse the pitch. Marketers defend the strategy. Designers
            walk the portfolio. Same club, different rubric.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-px border border-ink/15 bg-ink/15 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {TRACKS.map((track, i) => (
            <Reveal
              key={track.slug}
              delay={(i % 3) * 90}
              className="group flex items-start justify-between gap-4 bg-paper p-7 transition-colors hover:bg-card sm:p-8"
            >
              <div>
                <span className="stamp-label text-ink-soft">
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
                aria-hidden
                className="size-5 shrink-0 text-ink/40 transition-all group-hover:-translate-y-0.5 group-hover:text-vermilion rtl:-scale-x-100"
                strokeWidth={2}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
