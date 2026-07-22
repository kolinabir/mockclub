import { cn } from "@/lib/utils";

/**
 * MockClub mark — a vermilion C holding a chevron M.
 *
 * The M inherits `currentColor` so the mark works on paper and on ink without
 * a second variant; only the C is fixed to the brand vermilion.
 *
 * Geometry lives in one 64×64 viewBox and is reused by icon.svg, apple-icon
 * and the OG image, so all four can never drift apart.
 */
export function Logo({
  className,
  title = "MockClub",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("size-8 text-ink", className)}
    >
      <path
        d="M 51 16 A 25 25 0 1 0 51 48"
        fill="none"
        stroke="var(--vermilion, #D8452A)"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <path
        d="M 20 42 L 25 22 L 32 34 L 39 22 L 44 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + wordmark lockup, for the nav and footer. */
export function LogoWordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo className={size === "lg" ? "size-10" : "size-8"} title="" />
      <span
        className={cn(
          "display font-semibold tracking-tight",
          size === "lg" ? "text-3xl" : "text-2xl",
        )}
      >
        MockClub
      </span>
    </span>
  );
}
