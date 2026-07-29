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
import { languagesLine, stackLine, type CardData } from "@/server/profile/card";

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
/** Bold, not semibold. Every value on the card is set heavy — it is what makes
 *  the captions read as captions rather than as smaller text. */
const VALUE = "text-[3.2cqw] font-bold leading-[1.3]";

/** The two lines in the head rule are set LARGER than the captions below them:
 *  they title the whole card, they aren't labelling a field. */
const HEAD = "stamp-label text-[2.8cqw]";

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
      {/* The deck. Each sheet is offset right and down, and casts a soft shadow
          onto the one behind it — this is the one place in the design that
          isn't letterpress, because the card is a physical object sitting ON
          the page rather than printed into it. `.press` is deliberately not
          used: its hard offset reads as three black bars once stacked. */}
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-[1.4cqw] -end-[3.8cqw] start-[3.8cqw] top-[1.4cqw]",
          "rounded-[1.2cqw] border-[1.5px] border-ink/20 bg-card",
          "shadow-[1.6cqw_2cqw_3.6cqw_-0.8cqw_rgba(22,18,13,0.34)]",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute -bottom-[0.7cqw] -end-[1.9cqw] start-[1.9cqw] top-[0.7cqw]",
          "rounded-[1.2cqw] border-[1.5px] border-ink/25 bg-card",
          "shadow-[1.2cqw_1.5cqw_2.6cqw_-0.6cqw_rgba(22,18,13,0.3)]",
        )}
      />

      <article
        className={cn(
          // overflow-hidden so the footer band takes the corner with it —
          // without it the black bar squares off the two bottom corners.
          "relative overflow-hidden rounded-[1.2cqw] border-[1.5px] border-ink/70 bg-card",
          "shadow-[1.2cqw_1.6cqw_3cqw_-0.7cqw_rgba(22,18,13,0.32)]",
        )}
      >
        <div className="px-[5.3cqw] pb-[5cqw] pt-[5cqw]">
          <header className="flex items-baseline justify-between gap-[3cqw]">
            <p className={HEAD}>Interviewer card</p>
            <p className={cn(HEAD, "text-ink-soft")}>No. {data.no}</p>
          </header>

          <Rule className="-mx-[2.5cqw] mt-[3.2cqw]" />

          {/* Bottom-aligned against the plate, not centred. The right column is
              always shorter, and settling it on the photo's baseline is what
              opens the breathing space above the name — centring splits that
              gap in two and the name ends up crowding the head rule. */}
          <div className="mt-[4cqw] flex items-end gap-[3.6cqw]">
            {/* Portrait, not square. Stored photos ARE squares — cover crops
                the sides, which is the right loss for a head-and-shoulders shot
                and the wrong one to avoid: a square plate is half the height of
                this one and the card stops balancing. */}
            <div className="aspect-[2/3] w-[50%] shrink-0 overflow-hidden rounded-[3cqw] bg-lime">
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

            {/* Held just off the photo's bottom edge, so the two blocks read as
                sitting on the same line rather than one being flush. */}
            <div className="min-w-0 flex-1 pb-[1.8cqw]">
              <h2 className="display text-[7.05cqw] font-bold leading-[0.95]">
                {data.name}
              </h2>
              <p className={cn("mt-[3cqw]", LABEL)}>{data.position}</p>
              <p className={cn("mt-[2.2cqw] line-clamp-1", VALUE)}>{data.company}</p>

              <Rule className="mt-[6cqw]" />
              <p className={cn("mt-[3cqw]", LABEL)}>Track</p>
              {/* The column is sized so a ~20-character track — the longest in
                  content/tracks.ts — sits on one line beside the box. */}
              <div className={cn("mt-[2.8cqw] flex items-center gap-[1.2cqw]", VALUE)}>
                <span
                  aria-hidden
                  className="grid size-[5.6cqw] shrink-0 place-items-center border-[1.5px] border-ink/70"
                >
                  <TrackIcon className="size-[3cqw]" strokeWidth={2} />
                </span>
                <span className="line-clamp-2 min-w-0">{data.track}</span>
              </div>

              <Rule className="mt-[4.8cqw]" />
              <p className={cn("mt-[3.3cqw]", LABEL)}>Tech stack</p>
              {/* Bounded so the column can never outgrow the plate beside it.
                  stackLine does the trimming so the PNG shows the same words;
                  line-clamp is the belt-and-braces for scripts whose glyphs run
                  wider per character than the budget assumes. */}
              <p className={cn("mt-[2.8cqw] line-clamp-2", VALUE)}>
                {stackLine(data.skills)}
              </p>
            </div>
          </div>

          <Rule className="-mx-[2.5cqw] mt-[3.7cqw]" />

          <div className="mt-[5.7cqw] grid grid-cols-2 gap-[4cqw]">
            <Field label="Languages">{languagesLine(data.languages)}</Field>
            <Field label="Timezone">{zoneLabel(data.timeZone)}</Field>
          </div>

          <Rule className="-mx-[2.5cqw] mt-[6.2cqw]" />

          <div className="mt-[3.5cqw] flex items-center justify-between gap-[3cqw]">
            <div className="flex items-center gap-[1.7cqw]">
              <Logo className="size-[9cqw] shrink-0 text-ink" title="" />
              <span className="display text-[5.6cqw] font-bold">MockClub</span>
            </div>

            {/* The house stamp, same one the hero card carries. */}
            <div className="stamp -rotate-[9deg] px-[3.2cqw] py-[1.4cqw] text-center leading-[1.25]">
              <p className="text-[2.8cqw] font-bold">Real</p>
              <p className="text-[2.8cqw] font-bold">Humans</p>
              <p className="text-[2.8cqw] font-bold">Never AI</p>
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
