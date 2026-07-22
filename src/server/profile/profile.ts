import "server-only";

import { isValidTimeZone } from "@/lib/time";
import { getDb } from "@/server/db/mongo";

import {
  DISCIPLINE_SLUGS,
  KNOWN_SKILLS,
  MAX_CUSTOM_SKILL_LENGTH,
  MAX_SKILLS,
} from "@/content/skills";
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

export type SaveResult = { ok: true } | { ok: false; error: string };

let profileIndexEnsured = false;

function profiles() {
  const c = getDb().collection<ProfileDoc>("profile");
  if (!profileIndexEnsured) {
    profileIndexEnsured = true;
    // Every dashboard render reads this by userId; without an index that is a
    // full collection scan, and one profile per member means it only grows.
    void c.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
    // Booking will need "who can interview this discipline".
    void c.createIndex({ disciplines: 1 }).catch(() => {});
  }
  return c;
}

export async function getProfile(userId: string): Promise<ProfileDoc | null> {
  return profiles().findOne({ userId });
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
    yearsOfExperience?: unknown;
    company?: unknown;
    role?: unknown;
    current?: unknown;
    disciplines?: unknown;
    skills?: unknown;
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

  // Optional on purpose: profiles created before onboarding shipped have none
  // of these, and editing a language shouldn't force someone to fill them in.
  const extra: Partial<ProfileDoc> = {};

  if (input.yearsOfExperience !== undefined && input.yearsOfExperience !== "") {
    const years = validateYears(input.yearsOfExperience);
    if (!years.ok) return years;
    extra.yearsOfExperience = years.value;
  }
  if (input.company !== undefined || input.role !== undefined) {
    const hasAny =
      String(input.company ?? "").trim() || String(input.role ?? "").trim();
    if (hasAny) {
      const role = validateCurrentRole({
        company: input.company,
        role: input.role,
        current: input.current,
      });
      if (!role.ok) return role;
      extra.currentRole = role.value;
    }
  }
  if (Array.isArray(input.disciplines) && input.disciplines.length) {
    const d = validateDisciplines(input.disciplines);
    if (!d.ok) return d;
    extra.disciplines = d.value;

    const sk = validateSkills(input.skills);
    if (!sk.ok) return sk;
    extra.skills = sk.value;
  }

  await profiles().updateOne(
    { userId },
    {
      $set: {
        trackSlug,
        level: level as Level,
        languages: langs,
        links,
        timeZone,
        updatedAt: new Date(),
        ...extra,
        ...(customTrack ? { customTrack } : {}),
      },
      // Drop a stale custom value when switching back to a real track.
      ...(customTrack ? {} : { $unset: { customTrack: "" } }),
    },
    { upsert: true },
  );

  return { ok: true };
}

/**
 * What's still missing from a profile, as data.
 *
 * A dashboard that says "finish your profile" to someone who is 5/6 done is
 * just nagging. The profile document already knows exactly which fields are
 * absent, so say which ones — pure, so the answer can't drift from the
 * validation rules above.
 */
export type ChecklistItem = { key: string; label: string; done: boolean };

export function profileChecklist(profile: ProfileDoc | null): ChecklistItem[] {
  return [
    {
      key: "track",
      label: "Track and level",
      done: Boolean(profile?.trackSlug && profile?.level),
    },
    {
      key: "languages",
      label: "Languages you can interview in",
      done: (profile?.languages?.length ?? 0) > 0,
    },
    {
      key: "timeZone",
      label: "Your time zone",
      done: Boolean(profile?.timeZone),
    },
    {
      key: "links",
      label: `${MIN_PROFILE_LINKS} public profiles`,
      done: (profile?.links?.length ?? 0) >= MIN_PROFILE_LINKS,
    },
    {
      key: "disciplines",
      label: "Areas you can cover",
      done: (profile?.disciplines?.length ?? 0) > 0,
    },
    {
      key: "skills",
      label: "Skills you can assess",
      done: (profile?.skills?.length ?? 0) > 0,
    },
  ];
}

/** Interviewer supply — what gates opening booking. */
export async function countInterviewers(): Promise<number> {
  // Anchored to comma boundaries: an unanchored /interviewer/ would also match
  // a future role like "pre-interviewer" and silently inflate the count.
  return getDb()
    .collection("user")
    .countDocuments({ role: /(^|,)\s*interviewer\s*(,|$)/ });
}

/* ---------------------------------------------------------------------------
 * Shared field validators.
 *
 * Onboarding (server/onboarding/steps.ts) and the profile form both write these
 * fields, so the rules live HERE, next to ProfileDoc, and both callers import
 * them. Two copies of "years must be 0-50" is how the two screens drift apart.
 * ------------------------------------------------------------------------- */

export type CurrentRole = { company: string; role: string; current: boolean };

export type FieldResult<T> =
  { ok: true; value: T } | { ok: false; error: string };

function requiredText(
  v: unknown,
  label: string,
  max = 120,
): FieldResult<string> {
  if (typeof v !== "string" || !v.trim())
    return { ok: false, error: `Please add your ${label}.` };
  const s = v.trim();
  if (s.length > max) return { ok: false, error: `That ${label} is too long.` };
  return { ok: true, value: s };
}

export function validateYears(v: unknown): FieldResult<number> {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 50)
    return {
      ok: false,
      error: "Years of experience should be between 0 and 50.",
    };
  return { ok: true, value: Math.round(n) };
}

export function validateCurrentRole(input: {
  company: unknown;
  role: unknown;
  current?: unknown;
}): FieldResult<CurrentRole> {
  const company = requiredText(input.company, "company");
  if (!company.ok) return company;
  const role = requiredText(input.role, "job title");
  if (!role.ok) return role;
  return {
    ok: true,
    value: {
      company: company.value,
      role: role.value,
      current: input.current !== false,
    },
  };
}

export function validateDisciplines(v: unknown): FieldResult<string[]> {
  const list = Array.isArray(v)
    ? [
        ...new Set(
          v.filter(
            (d): d is string =>
              typeof d === "string" && DISCIPLINE_SLUGS.has(d),
          ),
        ),
      ]
    : [];
  if (list.length === 0)
    return { ok: false, error: "Pick at least one area you can interview in." };
  return { ok: true, value: list };
}

export function validateSkills(v: unknown): FieldResult<string[]> {
  const raw = Array.isArray(v) ? v : [];
  const skills: string[] = [];
  for (const s of raw) {
    if (typeof s !== "string") continue;
    const t = s.trim();
    if (!t) continue;
    // Custom entries are allowed — the taxonomy will never be complete — but
    // capped so the field can't be used as free storage.
    if (!KNOWN_SKILLS.has(t) && t.length > MAX_CUSTOM_SKILL_LENGTH) continue;
    if (!skills.includes(t)) skills.push(t);
  }
  if (skills.length === 0)
    return {
      ok: false,
      error: "Pick at least one skill you're comfortable assessing.",
    };
  if (skills.length > MAX_SKILLS)
    return {
      ok: false,
      error: `Please keep it to ${MAX_SKILLS} skills or fewer.`,
    };
  return { ok: true, value: skills };
}

/** Re-exported so existing callers keep one import site. The implementation
 * lives in lib/time — see the note there on why neither Intl check works alone. */
export { isValidTimeZone };
