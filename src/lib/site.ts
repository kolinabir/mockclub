/**
 * Single source of truth for site-wide identity — used by metadata, JSON-LD,
 * the sitemap, robots.txt and the OG image. Keep it framework-free.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://mockclub.com";

// NEXT_PUBLIC_* is inlined at build time, so a production build that was run
// without this variable set bakes "http://localhost:3000" into every canonical
// tag, the sitemap and the JSON-LD — and Google drops a page whose canonical
// points at a host it cannot reach. It fails silently and looks like "the SEO
// just isn't working", so say it loudly at build time instead.
if (
  process.env.NODE_ENV === "production" &&
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(SITE_URL)
) {
  console.warn(
    `\n[site] NEXT_PUBLIC_APP_URL is "${SITE_URL}" in a production build.\n` +
      `[site] Canonicals, sitemap.xml, robots.txt and OG tags will all point at\n` +
      `[site] localhost, and the site will not be indexable. Set it to the real\n` +
      `[site] origin (e.g. https://mockclub.com) and rebuild.\n`,
  );
}

export const SITE_NAME = "MockClub";
export const SITE_EMAIL = "contact@mockclub.com";
export const SITE_TAGLINE = "Made by devs, for everyone.";

/** Public source repo — the club is open source, so this is linked everywhere. */
export const SITE_REPO_URL = "https://github.com/kolinabir/mockclub";

export const SITE_DESCRIPTION =
  "Free mock interviews with real people. A volunteer-run club where working professionals give an hour to practise with people breaking in. No AI, no payments, any language.";

/** Locales we intend to serve. Drives hreflang once translations land. */
export const LOCALES = [
  "en",
  "bn",
  "es",
  "hi",
  "ar",
  "pt",
  "fr",
  "id",
] as const;
export type Locale = (typeof LOCALES)[number];
