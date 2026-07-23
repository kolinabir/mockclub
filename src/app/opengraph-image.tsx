import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const alt = `${SITE_NAME} — free mock interviews with real people`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F2EDE3";
const INK = "#17150F";
const VERMILION = "#D8452A";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: PAPER,
        color: INK,
        padding: 72,
        fontFamily: "Georgia, serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
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
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5 }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: VERMILION,
            fontFamily: "monospace",
          }}
        >
          Free forever
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Satori throws on any div with >1 child and no explicit display,
              so every line is its own flex row — no <br>, no bare spans. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          <div style={{ display: "flex" }}>Practice with someone who</div>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ display: "flex" }}>has</div>
            <div style={{ display: "flex", color: VERMILION }}>
              actually hired
            </div>
            <div style={{ display: "flex" }}>people.</div>
          </div>
        </div>
        {/* Single interpolated string — an expression plus adjacent text
              counts as two children and Satori rejects it. */}
        <div style={{ fontSize: 30, color: "#5A5346", lineHeight: 1.4 }}>
          {`${SITE_TAGLINE} Volunteer-run mock interviews — real humans, never AI, any language.`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          borderTop: `3px solid ${INK}`,
          paddingTop: 22,
          fontSize: 22,
          letterSpacing: 3,
          textTransform: "uppercase",
          fontFamily: "monospace",
          color: "#5A5346",
        }}
      >
        {SITE_URL.replace(/^https?:\/\//, "")}
      </div>
    </div>,
    size,
  );
}
