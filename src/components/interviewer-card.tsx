import {
  ChartColumn,
  ClipboardList,
  Cloud,
  CodeXml,
  Compass,
  Handshake,
  Megaphone,
  PenTool,
  Rocket,
  ShieldCheck,
  Smartphone,
  TestTube,
  type LucideIcon,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { photoUrl } from "@/lib/photo";
import { zoneLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { CardData } from "@/server/profile/card";

/**
 * The printed card.
 *
 * Presentation only — it takes a `CardData` and draws it. Whether a member is
 * ALLOWED to see their own card is decided in server/profile/card.ts, and the
 * blur over the locked state is applied by the page, not here.
 *
 * EVERY dimension is in `cqw` — percent of the card's OWN width, via the
 * `@container` on the wrapper. Not a flourish: a card is a printed object, so
 * its type size, rules and margins are fixed FRACTIONS of its width, and the
 * whole thing has to scale as one piece from a phone to a desktop column. Sized
 * in rem instead, the type stays put while the card grows and the proportions
 * drift — which is exactly how the first pass came out wrong.
 *
 * The numbers below are measured off the reference artwork, as % of card width.
 */

const TRACK_ICONS: Record<string, LucideIcon> = {
  "software-engineering": CodeXml,
  "product-management": Compass,
  design: PenTool,
  "data-and-ml": ChartColumn,
  "marketing-and-growth": Megaphone,
  founders: Rocket,
  "devops-and-cloud": Cloud,
  "mobile-engineering": Smartphone,
  "qa-and-testing": TestTube,
  security: ShieldCheck,
  sales: Handshake,
  "project-management": ClipboardList,
};

/** Caption size, and the value size under it. Used at every label/value pair. */
const LABEL = "stamp-label text-[2.45cqw] text-ink-soft";
const VALUE = "text-[3.2cqw] font-semibold leading-[1.3]";

/** A hairline rule. Bleeds slightly WIDER than the type block, as in the
 *  reference — the rules are the card's ruling, not the paragraph's. */
function Rule({ className }: { className?: string }) {
  return (
    <div className={cn("border-t border-ink/20", className)} aria-hidden />
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className={LABEL}>{label}</p>
      <div className={cn("mt-[2.9cqw]", VALUE)}>{children}</div>
    </div>
  );
}

export function InterviewerCard({
  data,
  className,
}: {
  data: CardData;
  className?: string;
}) {
  const TrackIcon = TRACK_ICONS[data.trackSlug] ?? CodeXml;

  return (
    // @container is on the WRAPPER, not the article, so the cards stacked
    // behind can be measured in the same units.
    <div className={cn("@container relative isolate", className)}>
      {/* Hairline only — the hard letterpress shadow belongs to the card in
          front, and three of them stacked read as bars, not paper. */}
      <div
        aria-hidden
        className="absolute -bottom-[1.4cqw] -end-[3.8cqw] start-[3.8cqw] top-[1.4cqw] border-[1.5px] border-ink/20 bg-card"
      />
      <div
        aria-hidden
        className="absolute -bottom-[0.7cqw] -end-[1.9cqw] start-[1.9cqw] top-[0.7cqw] border-[1.5px] border-ink/25 bg-card"
      />

      <article className="press relative bg-card">
        <div className="px-[5.3cqw] pb-[5.4cqw] pt-[6.2cqw]">
          <header className="flex items-baseline justify-between gap-[3cqw]">
            <p className="stamp-label text-[2.45cqw]">Interviewer card</p>
            <p className="stamp-label text-[2.45cqw] text-ink-soft">
              No. {data.no}
            </p>
          </header>

          <Rule className="-mx-[2.5cqw] mt-[4.2cqw]" />

          {/* Centred against the plate: the right column is always shorter, and
              hanging it off the top leaves the card bottom-heavy. */}
          <div className="mt-[4cqw] flex items-center gap-[4.2cqw]">
            {/* Portrait, not square. Stored photos ARE squares — cover crops
                the sides, which is the right loss for a head-and-shoulders shot
                and the wrong one to avoid: a square plate is half the height of
                this one and the card stops balancing. */}
            <div className="aspect-[2/3] w-[51%] shrink-0 overflow-hidden rounded-[3cqw] bg-lime">
              {data.photoKey ? (
                // A plain <img>, same reasoning as the profile page: the bytes
                // are already a 512px square, so there is nothing for
                // next/image to optimise and no remote host to configure.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl(data.photoKey)}
                  alt={`${data.name}, interviewer`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full" role="img" aria-label="No photo yet" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="display text-[7.05cqw] font-semibold leading-[0.95]">
                {data.name}
              </h2>
              <p className={cn("mt-[3cqw]", LABEL)}>{data.position}</p>
              <p className={cn("mt-[2.2cqw]", VALUE)}>{data.company}</p>

              <Rule className="mt-[6cqw]" />
              <p className={cn("mt-[3cqw]", LABEL)}>Track</p>
              <div className={cn("mt-[2.8cqw] flex items-center gap-[1.4cqw]", VALUE)}>
                <span
                  aria-hidden
                  className="grid size-[5.6cqw] shrink-0 place-items-center border-[1.5px] border-ink/70"
                >
                  <TrackIcon className="size-[3cqw]" strokeWidth={2} />
                </span>
                <span className="min-w-0">{data.track}</span>
              </div>

              <Rule className="mt-[4.8cqw]" />
              <p className={cn("mt-[3.3cqw]", LABEL)}>Tech stack</p>
              <p className={cn("mt-[2.8cqw]", VALUE)}>
                {data.skills.join(", ")}
              </p>
            </div>
          </div>

          <Rule className="-mx-[2.5cqw] mt-[3.7cqw]" />

          <div className="mt-[5.7cqw] grid grid-cols-2 gap-[4cqw]">
            <Field label="Languages">{data.languages.join(" + ")}</Field>
            <Field label="Timezone">{zoneLabel(data.timeZone)}</Field>
          </div>

          <Rule className="-mx-[2.5cqw] mt-[6.2cqw]" />

          <div className="mt-[6.1cqw] flex items-center justify-between gap-[3cqw]">
            <div className="flex items-center gap-[1.7cqw]">
              <Logo className="size-[9cqw] shrink-0 text-ink" title="" />
              <span className="display text-[5.6cqw] font-semibold">
                MockClub
              </span>
            </div>

            {/* The house stamp, same one the hero card carries. */}
            <div className="stamp -rotate-[9deg] px-[3cqw] py-[1.2cqw] text-center leading-[1.2]">
              <p className="text-[3cqw] font-bold">Real</p>
              <p className="text-[3cqw] font-bold">Humans</p>
              <p className="text-[3cqw] font-bold">Never AI</p>
            </div>
          </div>
        </div>

        {/* Smaller than the other captions on purpose: at caption size this
            line is wider than the card and wraps, and a two-line footer bar
            doubles the height of the one element meant to be a hairline band. */}
        <footer className="bg-panel px-[3cqw] py-[1.9cqw]">
          <p className="stamp-label whitespace-nowrap text-center text-[2.1cqw] text-panel-fg/70">
            Valid indefinitely · Non-transferable · Priceless
          </p>
        </footer>
      </article>
    </div>
  );
}
