import { zoneLabel } from "@/lib/time";
import type { CardData } from "@/server/profile/card";

/**
 * The card, laid out for the PNG renderer.
 *
 * A SECOND expression of the design, and deliberately so: the renderer behind
 * the download understands a subset of CSS — flexbox and px, no container
 * queries, no custom properties — so the proportions that components/
 * interviewer-card.tsx holds in `cqw` are written here in px at a fixed width.
 * They are the same numbers ×10. Change one, change both.
 *
 * Kept out of the route file because a Next route module may only export its
 * handlers, and this has to be importable on its own to be looked at.
 */

/** The card's own width. Every measurement below is the component's cqw × 10. */
export const CARD_W = 1000;
const W = CARD_W;
/** Paper margin around the card, and the hard letterpress offset. */
export const MARGIN = 48;
export const SHADOW = 12;
/**
 * The rendered height of the layout below, measured — the renderer needs the
 * canvas size up front, so this cannot be derived. The content block absorbs
 * any remaining slack, which keeps the footer band welded to the bottom edge
 * rather than floating above it when a card runs short.
 */
export const CARD_H = 1467;

const PAD = 53;
/** The rules bleed wider than the type block, as they do on the card. */
const BLEED = 25;
const CONTENT = W - PAD * 2;
const PHOTO_W = Math.round(CONTENT * 0.51);
const PHOTO_H = Math.round(PHOTO_W * 1.5);
const COL_GAP = 42;
const COL_W = CONTENT - PHOTO_W - COL_GAP;

/* Resolved from the live stylesheet — the renderer has no CSS variables, and
   oklch() is not in its subset. Light theme: a downloaded card is a printed
   object, not a screen that follows your system theme. */
export const PAPER = "#f5f0e6";
const CARD = "#fbf7f0";
const INK = "#16120d";
const INK_SOFT = "#57524a";
const VERMILION = "#d73c22";
const VERMILION_DEEP = "#b82000";
const LIME = "#bded54";
const RULE = "rgba(22, 18, 13, 0.2)";

const DISPLAY = "Fraunces";
const BODY = "Archivo";
const MONO = "FragmentMono";

/** The caption style used at every label on the card. */
const label = (size = 24.5) =>
  ({
    fontFamily: MONO,
    fontSize: size,
    letterSpacing: size * 0.22,
    textTransform: "uppercase",
    color: INK_SOFT,
  }) as const;

const value = {
  fontFamily: BODY,
  fontSize: 32,
  fontWeight: 600,
  color: INK,
  lineHeight: 1.3,
} as const;

function Rule({ width, top }: { width: number; top: number }) {
  return (
    <div
      style={{
        width,
        height: 1,
        marginTop: top,
        background: RULE,
      }}
    />
  );
}

function Mark({ size }: { size: number }) {
  // Same geometry as components/logo.tsx and the OG image — one 64×64 viewBox
  // reused everywhere so the mark can never drift between them.
  return (
    <svg width={size} height={size} viewBox="0 0 64 64">
      <path
        d="M 51 16 A 25 25 0 1 0 51 48"
        fill="none"
        stroke={VERMILION}
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M 20 42 L 25 22 L 32 34 L 39 22 L 44 42"
        fill="none"
        stroke={INK}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CardPrint({ data, photo }: { data: CardData; photo: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: W,
        height: CARD_H,
        background: CARD,
        border: `2px solid ${INK}`,
        boxShadow: `${SHADOW}px ${SHADOW}px 0 0 ${INK}`,
      }}
    >
      {/* flexGrow absorbs any slack between the measured constant above and the
          real height of the type, so the footer band stays welded to the
          bottom edge instead of floating. */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          padding: `62px ${PAD}px 54px ${PAD}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div style={{ ...label(), color: INK }}>Interviewer card</div>
          <div style={label()}>{`No. ${data.no}`}</div>
        </div>

        <div style={{ display: "flex", marginLeft: -BLEED }}>
          <Rule width={CONTENT + BLEED * 2} top={42} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              width: PHOTO_W,
              height: PHOTO_H,
              borderRadius: 30,
              background: LIME,
              overflow: "hidden",
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                width={PHOTO_W}
                height={PHOTO_H}
                style={{ width: PHOTO_W, height: PHOTO_H, objectFit: "cover" }}
              />
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: COL_W,
              marginLeft: COL_GAP,
            }}
          >
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 70,
                fontWeight: 600,
                color: INK,
                lineHeight: 0.95,
                letterSpacing: -1.8,
              }}
            >
              {data.name}
            </div>
            <div style={{ ...label(), marginTop: 30 }}>{data.position}</div>
            <div style={{ ...value, marginTop: 22 }}>{data.company}</div>

            <Rule width={COL_W} top={60} />
            <div style={{ ...label(), marginTop: 30 }}>Track</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 28,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 56,
                  height: 56,
                  marginRight: 14,
                  border: `2px solid ${INK}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: 24,
                  color: INK,
                }}
              >
                {/* The component picks a lucide glyph per track. Here it is one
                    mark for all of them: the renderer's SVG support is a subset,
                    and a box that fails to draw is worse than a neutral one. */}
                {"</>"}
              </div>
              <div style={value}>{data.track}</div>
            </div>

            <Rule width={COL_W} top={48} />
            <div style={{ ...label(), marginTop: 33 }}>Tech stack</div>
            <div style={{ ...value, marginTop: 28 }}>
              {data.skills.join(", ")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginLeft: -BLEED }}>
          <Rule width={CONTENT + BLEED * 2} top={37} />
        </div>

        <div style={{ display: "flex", marginTop: 57 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: (CONTENT - 40) / 2,
              marginRight: 40,
            }}
          >
            <div style={label()}>Languages</div>
            <div style={{ ...value, marginTop: 29 }}>
              {data.languages.join(" + ")}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: (CONTENT - 40) / 2,
            }}
          >
            <div style={label()}>Timezone</div>
            <div style={{ ...value, marginTop: 29 }}>
              {zoneLabel(data.timeZone)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginLeft: -BLEED }}>
          <Rule width={CONTENT + BLEED * 2} top={62} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 61,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Mark size={90} />
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: 56,
                fontWeight: 600,
                color: INK,
                marginLeft: 17,
                letterSpacing: -1.4,
              }}
            >
              MockClub
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "12px 30px",
              border: `4px solid ${VERMILION}`,
              transform: "rotate(-9deg)",
              fontFamily: MONO,
              fontSize: 30,
              lineHeight: 1.2,
              letterSpacing: 4.8,
              textTransform: "uppercase",
              color: VERMILION_DEEP,
            }}
          >
            <div style={{ display: "flex" }}>Real</div>
            <div style={{ display: "flex" }}>Humans</div>
            <div style={{ display: "flex" }}>Never AI</div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          background: INK,
          padding: "19px 30px",
        }}
      >
        <div style={{ ...label(21), color: "rgba(245, 240, 230, 0.7)" }}>
          Valid indefinitely · Non-transferable · Priceless
        </div>
      </div>
    </div>
  );
}
