import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS home-screen icon. Same geometry as icon.svg, scaled 64 → 180 and given
 * a full-bleed paper background (iOS masks the corners itself).
 */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#F2EDE3",
      }}
    >
      <svg width="150" height="150" viewBox="0 0 64 64">
        <path
          d="M 51 16 A 25 25 0 1 0 51 48"
          fill="none"
          stroke="#D8452A"
          strokeWidth="7.5"
          strokeLinecap="round"
        />
        <path
          d="M 20 42 L 25 22 L 32 34 L 39 22 L 44 42"
          fill="none"
          stroke="#17150F"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>,
    size,
  );
}
