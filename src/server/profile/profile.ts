import "server-only";

import { getDb } from "@/server/db/mongo";

import { OTHER_TRACK_SLUG, TRACKS } from "@/content/tracks";

/**
 * Member profile. Kept in its own collection rather than Better Auth's
 * `additionalFields` because languages is an ARRAY, and the docs are explicit
 * that additionalFields has no array type and no full type inference.
 */

export const LEVELS = ["entry", "mid", "senior", "switcher"] as const;
export type Level = (typeof LEVELS)[number];

export const LANGUAGES = [
  "English",
  "বাংলা",
  "हिन्दी",
  "Español",
  "Português",
  "العربية",
  "Français",
  "Bahasa Indonesia",
  "Tiếng Việt",
  "中文",
  "Русский",
  "اردو",
] as const;

export const LINK_TYPES = [
  "website",
  "linkedin",
  "x",
  "github",
  "facebook",
  "instagram",
  "youtube",
  "other",
] as const;
export type LinkType = (typeof LINK_TYPES)[number];

export type ProfileLink = { type: LinkType; url: string };

/** Two public profiles is the bar — it's how members know who they're talking to. */
export const MIN_PROFILE_LINKS = 2;

/**
 * Hosts we expect per type, so a link can't be mislabelled (someone tagging a
 * random site as "LinkedIn"). `website` and `other` accept any host.
 */
const EXPECTED_HOSTS: Partial<Record<LinkType, string[]>> = {
  linkedin: ["linkedin.com"],
  x: ["x.com", "twitter.com"],
  github: ["github.com"],
  facebook: ["facebook.com", "fb.com", "fb.me"],
  instagram: ["instagram.com"],
  youtube: ["youtube.com", "youtu.be"],
};

const LABEL: Record<LinkType, string> = {
  website: "Website",
  linkedin: "LinkedIn",
  x: "X",
  github: "GitHub",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  other: "Link",
};

/** Exported so onboarding validates links through the SAME rules — this is
 * where the javascript:/data: XSS guard lives, and it must have one home. */
export function normalizeLink(
  type: unknown,
  rawUrl: unknown,
): { ok: true; link: ProfileLink } | { ok: false; error: string } {
  if (typeof type !== "string" || !LINK_TYPES.includes(type as LinkType))
    return { ok: false, error: "Pick what kind of link that is." };
  if (typeof rawUrl !== "string" || !rawUrl.trim())
    return { ok: false, error: "Add the link itself." };

  const raw = rawUrl.trim();
  if (raw.length > 300) return { ok: false, error: "That link is too long." };

  // People type "linkedin.com/in/me" without a scheme.
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return {
      ok: false,
      error: `That ${LABEL[type as LinkType]} link isn't a valid URL.`,
    };
  }

  // Only http(s). Blocks javascript:, data:, file: — these render as clickable
  // links for other members, so anything else is an XSS vector.
  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { ok: false, error: "Links must start with http:// or https://" };

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes("."))
    return { ok: false, error: "That link isn't a valid URL." };

  const expected = EXPECTED_HOSTS[type as LinkType];
  if (expected && !expected.some((h) => host === h || host.endsWith(`.${h}`)))
    return {
      ok: false,
      error: `A ${LABEL[type as LinkType]} link should point at ${expected[0]}.`,
    };

  return { ok: true, link: { type: type as LinkType, url: url.toString() } };
}

export type ProfileDoc = {
  userId: string;
  trackSlug: string;
  /** Only set when trackSlug === "other" — what they typed instead. */
  customTrack?: string;
  level: Level;
  languages: string[];
  /** At least MIN_PROFILE_LINKS public profiles — our identity signal. */
  links: ProfileLink[];
  /** IANA id only — never an offset or abbreviation (see PLAN.md §4). */
  timeZone: string;
  updatedAt: Date;

  /* Set by onboarding (src/server/onboarding). Optional because profiles
     created before onboarding shipped predate them. */
  /** Discipline slugs from content/skills.ts, e.g. ["frontend","backend"]. */
  disciplines?: string[];
  /** Skill names — taxonomy entries plus capped custom ones. */
  skills?: string[];
  yearsOfExperience?: number;
  currentRole?: { company: string; role: string; current: boolean };
};

const TRACK_SLUGS = new Set([...TRACKS.map((t) => t.slug), OTHER_TRACK_SLUG]);

/** Validate against the runtime's own tz database — not a hand-rolled list. */
export function isValidTimeZone(tz: string): boolean {
  try {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (k: string) => string[];
      }
    ).supportedValuesOf?.("timeZone");
    if (supported) return supported.includes(tz);
    // Fallback for runtimes without supportedValuesOf.
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function getProfile(userId: string): Promise<ProfileDoc | null> {
  return getDb().collection<ProfileDoc>("profile").findOne({ userId });
}

export async function saveProfile(
  userId: string,
  input: {
    trackSlug: unknown;
    customTrack?: unknown;
    level: unknown;
    languages: unknown;
    timeZone: unknown;
    links?: unknown;
  },
): Promise<SaveResult> {
  const { trackSlug, level, languages, timeZone } = input;

  if (typeof trackSlug !== "string" || !TRACK_SLUGS.has(trackSlug))
    return { ok: false, error: "Pick a track." };

  // "Other" means they typed their own — require and bound it. Length-capped
  // because it will be shown to other members.
  let customTrack: string | undefined;
  if (trackSlug === OTHER_TRACK_SLUG) {
    const raw =
      typeof input.customTrack === "string" ? input.customTrack.trim() : "";
    if (raw.length < 2)
      return { ok: false, error: "Tell us what you're practising for." };
    if (raw.length > 60)
      return { ok: false, error: "Keep the track under 60 characters." };
    customTrack = raw.replace(/\s+/g, " ");
  }
  if (typeof level !== "string" || !LEVELS.includes(level as Level))
    return { ok: false, error: "Pick your level." };
  if (typeof timeZone !== "string" || !isValidTimeZone(timeZone))
    return { ok: false, error: "That timezone isn't recognised." };

  const langs = Array.isArray(languages)
    ? languages.filter(
        (l): l is string =>
          typeof l === "string" && LANGUAGES.includes(l as never),
      )
    : [];
  if (langs.length === 0)
    return {
      ok: false,
      error: "Pick at least one language you can interview in.",
    };

  const rawLinks = Array.isArray(input.links) ? input.links : [];
  const links: ProfileLink[] = [];
  const seen = new Set<string>();

  for (const item of rawLinks) {
    if (!item || typeof item !== "object") continue;
    const { type, url } = item as { type?: unknown; url?: unknown };
    if (typeof url === "string" && !url.trim()) continue; // ignore blank rows

    const res = normalizeLink(type, url);
    if (!res.ok) return res;

    const key = res.link.url.toLowerCase().replace(/\/+$/, "");
    if (seen.has(key)) continue; // same link twice doesn't count twice
    seen.add(key);
    links.push(res.link);
  }

  if (links.length < MIN_PROFILE_LINKS)
    return {
      ok: false,
      error: `Add at least ${MIN_PROFILE_LINKS} links so people know who you are.`,
    };

  await getDb()
    .collection<ProfileDoc>("profile")
    .updateOne(
      { userId },
      {
        $set: {
          trackSlug,
          level: level as Level,
          languages: langs,
          links,
          timeZone,
          updatedAt: new Date(),
          ...(customTrack ? { customTrack } : {}),
        },
        // Drop a stale custom value when switching back to a real track.
        ...(customTrack ? {} : { $unset: { customTrack: "" } }),
      },
      { upsert: true },
    );

  return { ok: true };
}

/** Interviewer supply — what gates opening booking. */
export async function countInterviewers(): Promise<number> {
  // Anchored to comma boundaries: an unanchored /interviewer/ would also match
  // a future role like "pre-interviewer" and silently inflate the count.
  return getDb()
    .collection("user")
    .countDocuments({ role: /(^|,)\s*interviewer\s*(,|$)/ });
}
