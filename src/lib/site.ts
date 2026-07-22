/**
 * Single source of truth for site-wide identity — used by metadata, JSON-LD,
 * the sitemap, robots.txt and the OG image. Keep it framework-free.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://mockclub.com";

export const SITE_NAME = "MockClub";
export const SITE_EMAIL = "contact@mockclub.com";
export const SITE_TAGLINE = "Made by devs, for everyone.";

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
