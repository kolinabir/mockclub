import "server-only";

import {
  DISCIPLINE_SLUGS,
  KNOWN_SKILLS,
  MAX_CUSTOM_SKILL_LENGTH,
  MAX_SKILLS,
} from "@/content/skills";
import { DISCIPLINES } from "@/content/skills";
import { getMongoClient } from "@/server/db/mongo";
import { drafts, type OnboardingDraft } from "@/server/onboarding/draft";
import {
  LANGUAGES,
  LEVELS,
  MIN_PROFILE_LINKS,
  isValidTimeZone,
  normalizeLink,
  type Level,
  type ProfileLink,
} from "@/server/profile/profile";
import { users, userFilter } from "@/server/users/users";

/**
 * Multi-step onboarding, as ONE module with a two-function interface:
 *
 *   getState(userId)            -> where they are and what they've filled in
 *   saveStep(userId, id, input) -> validate, persist, report the next step
 *
 * Everything else — per-step validation, ordering, completion rules, the final
 * materialisation — sits behind that. Adding a sixth step (availability, when
 * it lands) touches no caller.
 *
 * The shallow alternative was one action per step: saveNameAction,
 * saveLevelAction, saveSkillsAction... That grows the interface with every
 * step and scatters validation across as many files.
 */

export const STEPS = ["identity", "experience", "expertise", "trust"] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  identity: "About you",
  experience: "Your experience",
  expertise: "What you can interview on",
  trust: "How people know it's you",
};

export type OnboardingState = {
  step: StepId;
  stepIndex: number;
  totalSteps: number;
  draft: OnboardingDraft["data"];
  complete: boolean;
};

export type StepResult =
  | { ok: true; next: StepId | null; complete: boolean }
  | { ok: false; error: string };

const MAX_TEXT = 120;

/** Trim + length-guard a required free-text field. */
function text(
  v: unknown,
  label: string,
  max = MAX_TEXT,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof v !== "string" || !v.trim())
    return { ok: false, error: `Please add your ${label}.` };
  const s = v.trim();
  if (s.length > max) return { ok: false, error: `That ${label} is too long.` };
  return { ok: true, value: s };
}

// ---------------------------------------------------------------- validation

type Validated = Partial<OnboardingDraft["data"]>;
type Validation = { ok: true; data: Validated } | { ok: false; error: string };

function validateIdentity(input: Record<string, unknown>): Validation {
  const name = text(input.fullName, "name");
  if (!name.ok) return name;

  const languages = Array.isArray(input.languages)
    ? [
        ...new Set(
          input.languages.filter(
            (l): l is string =>
              typeof l === "string" &&
              (LANGUAGES as readonly string[]).includes(l),
          ),
        ),
      ]
    : [];
  if (languages.length === 0)
    return {
      ok: false,
      error: "Pick at least one language you can interview in.",
    };

  return { ok: true, data: { fullName: name.value, languages } };
}

function validateExperience(input: Record<string, unknown>): Validation {
  if (
    typeof input.level !== "string" ||
    !(LEVELS as readonly string[]).includes(input.level)
  )
    return { ok: false, error: "Pick the level you interview at." };

  const years = Number(input.yearsOfExperience);
  if (!Number.isFinite(years) || years < 0 || years > 50)
    return {
      ok: false,
      error: "Years of experience should be between 0 and 50.",
    };

  const company = text(input.company, "company");
  if (!company.ok) return company;
  const role = text(input.role, "job title");
  if (!role.ok) return role;

  return {
    ok: true,
    data: {
      level: input.level as Level,
      yearsOfExperience: Math.round(years),
      currentRole: {
        company: company.value,
        role: role.value,
        current: input.current !== false,
      },
    },
  };
}

function validateExpertise(input: Record<string, unknown>): Validation {
  const disciplines = Array.isArray(input.disciplines)
    ? [
        ...new Set(
          input.disciplines.filter(
            (d): d is string =>
              typeof d === "string" && DISCIPLINE_SLUGS.has(d),
          ),
        ),
      ]
    : [];
  if (disciplines.length === 0)
    return { ok: false, error: "Pick at least one area you can interview in." };

  const raw = Array.isArray(input.skills) ? input.skills : [];
  const skills: string[] = [];
  for (const s of raw) {
    if (typeof s !== "string") continue;
    const v = s.trim();
    if (!v) continue;
    // Custom entries are allowed (the taxonomy will never be complete), but
    // they're length-capped so the field can't be used as free storage.
    if (!KNOWN_SKILLS.has(v) && v.length > MAX_CUSTOM_SKILL_LENGTH) continue;
    if (!skills.includes(v)) skills.push(v);
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

  return { ok: true, data: { disciplines, skills } };
}

function validateTrust(input: Record<string, unknown>): Validation {
  const raw = Array.isArray(input.links) ? input.links : [];
  const links: ProfileLink[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { type, url } = entry as { type?: unknown; url?: unknown };
    if (typeof url !== "string" || !url.trim()) continue;
    // Same validator the profile form uses — the javascript:/data: XSS guard
    // has exactly one home.
    const result = normalizeLink(type, url);
    if (!result.ok) return result;
    if (!links.some((l) => l.url === result.link.url)) links.push(result.link);
  }
  if (links.length < MIN_PROFILE_LINKS)
    return {
      ok: false,
      error: `Add at least ${MIN_PROFILE_LINKS} links so people know who they're talking to.`,
    };

  if (typeof input.timeZone !== "string" || !isValidTimeZone(input.timeZone))
    return { ok: false, error: "Pick your time zone." };

  return { ok: true, data: { links, timeZone: input.timeZone } };
}

const VALIDATORS: Record<StepId, (i: Record<string, unknown>) => Validation> = {
  identity: validateIdentity,
  experience: validateExperience,
  expertise: validateExpertise,
  trust: validateTrust,
};

// ----------------------------------------------------------------- interface

/** First step whose data is missing — where to drop someone resuming. */
function firstIncomplete(data: OnboardingDraft["data"]): StepId | null {
  if (!data.fullName || !data.languages?.length) return "identity";
  if (!data.level || data.yearsOfExperience === undefined || !data.currentRole)
    return "experience";
  if (!data.disciplines?.length || !data.skills?.length) return "expertise";
  if (!data.links || data.links.length < MIN_PROFILE_LINKS || !data.timeZone)
    return "trust";
  return null;
}

export async function getState(userId: string): Promise<OnboardingState> {
  const draft = await drafts().findOne({ userId });
  const data = draft?.data ?? {};
  const next = firstIncomplete(data);
  const step = next ?? STEPS[STEPS.length - 1];
  return {
    step,
    stepIndex: STEPS.indexOf(step),
    totalSteps: STEPS.length,
    draft: data,
    complete: next === null,
  };
}

export async function saveStep(
  userId: string,
  stepId: unknown,
  input: Record<string, unknown>,
): Promise<StepResult> {
  if (typeof stepId !== "string" || !STEPS.includes(stepId as StepId))
    return { ok: false, error: "Unknown step." };
  const id = stepId as StepId;

  const validated = VALIDATORS[id](input);
  if (!validated.ok) return validated;

  // Persist the step on its own, so a drop-off is resumable rather than lost.
  await drafts().updateOne(
    { userId },
    {
      $set: { ...prefix(validated.data), updatedAt: new Date() },
      $setOnInsert: { userId, createdAt: new Date() },
    },
    { upsert: true },
  );

  const state = await getState(userId);
  // getState reports the earliest INCOMPLETE step, so editing an earlier one
  // jumps forward to what's still missing rather than walking the whole flow.
  if (!state.complete) return { ok: true, next: state.step, complete: false };

  await materialize(userId, state.draft);
  return { ok: true, next: null, complete: true };
}

/** `{a:1}` -> `{"data.a":1}` so one step can't clobber another's fields. */
function prefix(data: Validated): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [`data.${k}`, v]),
  );
}

/**
 * Commit the finished draft into the real collections.
 *
 * Written in ONE transaction: a profile without `onboardedAt`, or vice versa,
 * is a half-onboarded member the rest of the app has no way to reason about.
 * Atlas is a replica set, so transactions are available, and withTransaction
 * retries TransientTransactionError (the core API does not).
 */
async function materialize(
  userId: string,
  data: OnboardingDraft["data"],
): Promise<void> {
  const filter = userFilter(userId);
  if (!filter) throw new Error("materialize: malformed user id");

  const client = getMongoClient();
  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      const db = client.db();

      await db.collection("profile").updateOne(
        { userId },
        {
          $set: {
            userId,
            // Keep trackSlug populated: the dashboard and the per-track pages
            // still read it. Derive it from the first chosen discipline rather
            // than asking again for something we can infer.
            trackSlug:
              DISCIPLINES.find((d) => d.slug === data.disciplines?.[0])
                ?.trackSlug ?? "software-engineering",
            level: data.level,
            languages: data.languages,
            disciplines: data.disciplines,
            skills: data.skills,
            yearsOfExperience: data.yearsOfExperience,
            currentRole: data.currentRole,
            links: data.links,
            timeZone: data.timeZone,
            updatedAt: new Date(),
          },
        },
        { upsert: true, session },
      );

      await users().updateOne(
        filter,
        { $set: { name: data.fullName, onboardedAt: new Date() } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  // Best-effort cleanup; the TTL index sweeps it anyway.
  await drafts()
    .deleteOne({ userId })
    .catch(() => {});
}
