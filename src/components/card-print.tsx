import { zoneLabel } from "@/lib/time";
import { languagesLine, stackLine, type CardData } from "@/server/profile/card";

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
/** Paper margin around the card, and how far its shadow reaches. */
export const MARGIN = 48;
export const SHADOW = 12;
/**
 * The rendered height of the layout below, measured — the renderer needs the
 * canvas size up front, so this cannot be derived. The content block absorbs
 * any remaining slack, which keeps the footer band welded to the bottom edge
 * rather than floating above it when a card runs short.
 */
export const CARD_H = 1418;

const PAD = 53;
/** The rules bleed wider than the type block, as they do on the card. */
const BLEED = 25;
const CONTENT = W - PAD * 2;
const PHOTO_W = Math.round(CONTENT * 0.5);
const PHOTO_H = Math.round(PHOTO_W * 1.5);
const COL_GAP = 36;
const COL_W = CONTENT - PHOTO_W - COL_GAP;

/**
 * Every length below goes through this.
 *
 * The share image needs the same card at 40% — and the obvious way to get it,
 * `transform: scale()`, is not something the renderer honours: the layout came
 * out right and the logo SVG silently vanished. So the card is scaled by
 * MULTIPLYING its measurements instead, which is the only form the renderer
 * treats as real geometry.
 */
type U = (n: number) => number;

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
const label = (u: U, size = 24.5) =>
  ({
    fontFamily: MONO,
    fontSize: u(size),
    letterSpacing: u(size * 0.22),
    textTransform: "uppercase",
    color: INK_SOFT,
  }) as const;

const valueStyle = (u: U) =>
  ({
    fontFamily: BODY,
    fontSize: u(32),
    fontWeight: 700,
    color: INK,
    lineHeight: 1.3,
  }) as const;

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

export function CardPrint({
  data,
  photo,
  scale = 1,
}: {
  data: CardData;
  photo: string | null;
  /** 1 is the natural 1000px card. The share image renders it smaller. */
  scale?: number;
}) {
  const u: U = (n) => n * scale;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: u(W),
        height: u(CARD_H),
        background: CARD,
        border: `${u(2)}px solid rgba(22, 18, 13, 0.7)`,
        // Rounded, and overflow-hidden so the footer band takes the corner
        // with it. A card is an object sitting ON the page, which is the one
        // place this design is not letterpress — hence a soft shadow, not the
        // hard offset used everywhere else.
        borderRadius: u(12),
        overflow: "hidden",
        boxShadow: `${u(12)}px ${u(16)}px ${u(30)}px ${u(-7)}px rgba(22, 18, 13, 0.32)`,
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
          padding: `${u(50)}px ${u(PAD)}px ${u(50)}px ${u(PAD)}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <div style={{ ...label(u, 28), color: INK }}>Interviewer card</div>
          <div style={label(u, 28)}>{`No. ${data.no}`}</div>
        </div>

        <div style={{ display: "flex", marginLeft: u(-BLEED) }}>
          <Rule width={u(CONTENT + BLEED * 2)} top={u(32)} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            marginTop: u(40),
          }}
        >
          <div
            style={{
              display: "flex",
              width: u(PHOTO_W),
              height: u(PHOTO_H),
              borderRadius: u(30),
              background: LIME,
              overflow: "hidden",
            }}
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt=""
                width={u(PHOTO_W)}
                height={u(PHOTO_H)}
                style={{
                  width: u(PHOTO_W),
                  height: u(PHOTO_H),
                  objectFit: "cover",
                  // The renderer does NOT clip a child to its parent's radius,
                  // so the photo squares off the plate unless it carries the
                  // same corner itself.
                  borderRadius: u(30),
                }}
              />
            ) : null}
          </div>

          {/* Held just off the plate's bottom edge, so the two blocks read as
              sitting on the same line rather than one being flush. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: u(COL_W),
              marginLeft: u(COL_GAP),
              paddingBottom: u(18),
            }}
          >
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: u(70),
                fontWeight: 700,
                color: INK,
                lineHeight: 0.95,
                letterSpacing: u(-1.8),
              }}
            >
              {data.name}
            </div>
            <div style={{ ...label(u), marginTop: u(30) }}>{data.position}</div>
            <div style={{ ...valueStyle(u), marginTop: u(22) }}>{data.company}</div>

            <Rule width={u(COL_W)} top={u(60)} />
            <div style={{ ...label(u), marginTop: u(30) }}>Track</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: u(28),
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: u(56),
                  height: u(56),
                  marginRight: u(12),
                  border: `${u(2)}px solid ${INK}`,
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: MONO,
                  fontSize: u(24),
                  color: INK,
                }}
              >
                {/* The component picks a lucide glyph per track. Here it is one
                    mark for all of them: the renderer's SVG support is a subset,
                    and a box that fails to draw is worse than a neutral one. */}
                {"</>"}
              </div>
              <div style={valueStyle(u)}>{data.track}</div>
            </div>

            <Rule width={u(COL_W)} top={u(48)} />
            <div style={{ ...label(u), marginTop: u(33) }}>Tech stack</div>
            {/* Clamped for the same reason as the card: the column must not
                outgrow the plate beside it. */}
            <div style={{ ...valueStyle(u), marginTop: u(28) }}>
              {stackLine(data.skills)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginLeft: u(-BLEED) }}>
          <Rule width={u(CONTENT + BLEED * 2)} top={u(37)} />
        </div>

        <div style={{ display: "flex", marginTop: u(57) }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: u((CONTENT - 40) / 2),
              marginRight: u(40),
            }}
          >
            <div style={label(u)}>Languages</div>
            <div style={{ ...valueStyle(u), marginTop: u(29) }}>
              {languagesLine(data.languages)}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: u((CONTENT - 40) / 2),
            }}
          >
            <div style={label(u)}>Timezone</div>
            <div style={{ ...valueStyle(u), marginTop: u(29) }}>
              {zoneLabel(data.timeZone)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginLeft: u(-BLEED) }}>
          <Rule width={u(CONTENT + BLEED * 2)} top={u(62)} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: u(35),
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <Mark size={u(90)} />
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: u(56),
                fontWeight: 700,
                color: INK,
                marginLeft: u(17),
                letterSpacing: u(-1.4),
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
              padding: `${u(14)}px ${u(32)}px`,
              border: `${u(4)}px solid ${VERMILION}`,
              transform: "rotate(-9deg)",
              fontFamily: MONO,
              fontSize: u(28),
              lineHeight: 1.25,
              letterSpacing: u(4.5),
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
          padding: `${u(19)}px ${u(30)}px`,
        }}
      >
        <div style={{ ...label(u, 21), color: "rgba(245, 240, 230, 0.7)" }}>
          Valid indefinitely · Non-transferable · Priceless
        </div>
      </div>
    </div>
  );
}
