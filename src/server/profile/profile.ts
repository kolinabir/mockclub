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
  "English", "বাংলা", "हिन्दी", "Español", "Português", "العربية",
  "Français", "Bahasa Indonesia", "Tiếng Việt", "中文", "Русский", "اردو",
] as const;

export type ProfileDoc = {
  userId: string;
  trackSlug: string;
  /** Only set when trackSlug === "other" — what they typed instead. */
  customTrack?: string;
  level: Level;
  languages: string[];
  /** IANA id only — never an offset or abbreviation (see PLAN.md §4). */
  timeZone: string;
  updatedAt: Date;
};

const TRACK_SLUGS = new Set([...TRACKS.map((t) => t.slug), OTHER_TRACK_SLUG]);

/** Validate against the runtime's own tz database — not a hand-rolled list. */
function isValidTimeZone(tz: string): boolean {
  try {
    const supported = (Intl as unknown as {
      supportedValuesOf?: (k: string) => string[];
    }).supportedValuesOf?.("timeZone");
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
  }
): Promise<SaveResult> {
  const { trackSlug, level, languages, timeZone } = input;

  if (typeof trackSlug !== "string" || !TRACK_SLUGS.has(trackSlug))
    return { ok: false, error: "Pick a track." };

  // "Other" means they typed their own — require and bound it. Length-capped
  // because it will be shown to other members.
  let customTrack: string | undefined;
  if (trackSlug === OTHER_TRACK_SLUG) {
    const raw = typeof input.customTrack === "string" ? input.customTrack.trim() : "";
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
    ? languages.filter((l): l is string => typeof l === "string" && LANGUAGES.includes(l as never))
    : [];
  if (langs.length === 0)
    return { ok: false, error: "Pick at least one language you can interview in." };

  await getDb().collection<ProfileDoc>("profile").updateOne(
    { userId },
    {
      $set: {
        trackSlug,
        level: level as Level,
        languages: langs,
        timeZone,
        updatedAt: new Date(),
        ...(customTrack ? { customTrack } : {}),
      },
      // Drop a stale custom value when switching back to a real track.
      ...(customTrack ? {} : { $unset: { customTrack: "" } }),
    },
    { upsert: true }
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
