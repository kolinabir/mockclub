import "server-only";

import { DISCIPLINES } from "@/content/skills";
import { getMongoClient } from "@/server/db/mongo";
import { drafts, type OnboardingDraft } from "@/server/onboarding/draft";
import {
  LANGUAGES,
  LEVELS,
  isValidTimeZone,
  minLinksFor,
  normalizeLink,
  validateCurrentRole,
  validateDisciplines,
  validateFocus,
  validateInterviewTypes,
  validateOptionalUrl,
  validateSearchStage,
  validateSkills,
  validateYears,
  type Level,
  type MemberRole,
  type ProfileLink,
} from "@/server/profile/profile";
import { syncTimeZone } from "@/server/scheduling/scheduling";
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

/**
 * The two sides get different questions.
 *
 * An interviewer declares what they can ASSESS; a candidate declares what they
 * WANT. Running both through one sequence meant asking someone who signed up to
 * practise which technologies they were qualified to grade other people on —
 * and then requiring two public profiles from them at the very last step.
 *
 * `identity` and `trust` are shared ids because both roles answer them, but
 * their validators and copy differ by role.
 */
export const STEPS_FOR = {
  interviewer: ["identity", "experience", "expertise", "trust"],
  candidate: ["identity", "goal", "situation", "trust"],
} as const satisfies Record<MemberRole, readonly string[]>;

export type StepId =
  | "identity"
  | "experience"
  | "expertise"
  | "goal"
  | "situation"
  | "trust";

/** Kept for callers that just want "every step id that exists". */
export const STEPS = [
  "identity",
  "experience",
  "expertise",
  "goal",
  "situation",
  "trust",
] as const satisfies readonly StepId[];

export const STEP_TITLES: Record<MemberRole, Record<string, string>> = {
  interviewer: {
    identity: "About you",
    experience: "Your experience",
    expertise: "What you can interview on",
    trust: "How people know it's you",
  },
  candidate: {
    identity: "About you",
    goal: "What you're practising for",
    situation: "Where you are",
    trust: "So your interviewer can prepare",
  },
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

  const years = validateYears(input.yearsOfExperience);
  if (!years.ok) return years;

  const role = validateCurrentRole({
    company: input.company,
    role: input.role,
    current: input.current,
  });
  if (!role.ok) return role;

  return {
    ok: true,
    data: {
      level: input.level as Level,
      yearsOfExperience: years.value,
      currentRole: role.value,
    },
  };
}

/**
 * Candidate: what they want to practise.
 *
 * `level` here means the level they are INTERVIEWING AT, not the one they hold
 * today — a career switcher's current level and their target are different, and
 * matching on the wrong one wastes the session.
 */
function validateGoal(input: Record<string, unknown>): Validation {
  const disciplines = validateDisciplines(input.disciplines);
  if (!disciplines.ok) return disciplines;

  if (
    typeof input.level !== "string" ||
    !(LEVELS as readonly string[]).includes(input.level)
  )
    return { ok: false, error: "Pick the level you're interviewing at." };

  const interviewTypes = validateInterviewTypes(input.interviewTypes);
  if (!interviewTypes.ok) return interviewTypes;

  return {
    ok: true,
    data: {
      disciplines: disciplines.value,
      level: input.level as Level,
      interviewTypes: interviewTypes.value,
    },
  };
}

/**
 * Candidate: where they are.
 *
 * `currentRole` is OPTIONAL here and required for interviewers. Many candidates
 * are between jobs — that is often exactly why they're here — so demanding an
 * employer is both wrong and a little cruel.
 */
function validateSituation(input: Record<string, unknown>): Validation {
  const years = validateYears(input.yearsOfExperience);
  if (!years.ok) return years;

  const stage = validateSearchStage(input.searchStage);
  if (!stage.ok) return stage;

  const data: Validated = {
    yearsOfExperience: years.value,
    searchStage: stage.value,
  };

  const hasRole =
    String(input.company ?? "").trim() || String(input.role ?? "").trim();
  if (hasRole) {
    const role = validateCurrentRole({
      company: input.company,
      role: input.role,
      current: input.current,
    });
    if (!role.ok) return role;
    data.currentRole = role.value;
  }

  return { ok: true, data };
}

function validateExpertise(input: Record<string, unknown>): Validation {
  const disciplines = validateDisciplines(input.disciplines);
  if (!disciplines.ok) return disciplines;

  const skills = validateSkills(input.skills);
  if (!skills.ok) return skills;

  return {
    ok: true,
    data: { disciplines: disciplines.value, skills: skills.value },
  };
}

function validateTrust(role: MemberRole) {
  return (input: Record<string, unknown>): Validation => {
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

    const min = minLinksFor(role);
    if (links.length < min)
      return {
        ok: false,
        error:
          min === 1
            ? "Add one link — a CV, LinkedIn, GitHub or portfolio — so your interviewer knows who they're meeting."
            : `Add at least ${min} links so people know who they're talking to.`,
      };

    if (typeof input.timeZone !== "string" || !isValidTimeZone(input.timeZone))
      return { ok: false, error: "Pick your time zone." };

    const data: Validated = { links, timeZone: input.timeZone };

    // Everything below is candidate-only and optional — context that makes the
    // hour useful, never a gate on finishing.
    if (role === "candidate") {
      const cv = validateOptionalUrl(input.cvUrl, "CV link");
      if (!cv.ok) return cv;
      const job = validateOptionalUrl(input.jobUrl, "job link");
      if (!job.ok) return job;
      const focus = validateFocus(input.focus);
      if (!focus.ok) return focus;

      data.cvUrl = cv.value;
      data.jobUrl = job.value;
      data.focus = focus.value;
    }

    return { ok: true, data };
  };
}

function validatorsFor(
  role: MemberRole,
): Record<string, (i: Record<string, unknown>) => Validation> {
  return role === "candidate"
    ? {
        identity: validateIdentity,
        goal: validateGoal,
        situation: validateSituation,
        trust: validateTrust("candidate"),
      }
    : {
        identity: validateIdentity,
        experience: validateExperience,
        expertise: validateExpertise,
        trust: validateTrust("interviewer"),
      };
}

// ----------------------------------------------------------------- interface

/** First step whose data is missing — where to drop someone resuming. */
function firstIncomplete(
  data: OnboardingDraft["data"],
  role: MemberRole,
): StepId | null {
  if (!data.fullName || !data.languages?.length) return "identity";

  if (role === "candidate") {
    if (!data.disciplines?.length || !data.level || !data.interviewTypes?.length)
      return "goal";
    // currentRole is deliberately absent from this check — optional for them.
    if (data.yearsOfExperience === undefined || !data.searchStage)
      return "situation";
  } else {
    if (!data.level || data.yearsOfExperience === undefined || !data.currentRole)
      return "experience";
    if (!data.disciplines?.length || !data.skills?.length) return "expertise";
  }

  if (
    !data.links ||
    data.links.length < minLinksFor(role) ||
    !data.timeZone
  )
    return "trust";

  return null;
}

export async function getState(
  userId: string,
  role: MemberRole,
): Promise<OnboardingState> {
  const steps = STEPS_FOR[role];
  const draft = await drafts().findOne({ userId });
  const data = draft?.data ?? {};
  const next = firstIncomplete(data, role);
  const step = next ?? steps[steps.length - 1];
  return {
    step,
    stepIndex: (steps as readonly string[]).indexOf(step),
    totalSteps: steps.length,
    draft: data,
    complete: next === null,
  };
}

export async function saveStep(
  userId: string,
  role: MemberRole,
  stepId: unknown,
  input: Record<string, unknown>,
): Promise<StepResult> {
  const validators = validatorsFor(role);
  // Only steps belonging to THIS role are accepted — a candidate posting
  // `expertise` would otherwise write interviewer fields into their draft.
  if (typeof stepId !== "string" || !(stepId in validators))
    return { ok: false, error: "Unknown step." };
  const id = stepId as StepId;

  const validated = validators[id](input);
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

  const state = await getState(userId, role);
  // getState reports the earliest INCOMPLETE step, so editing an earlier one
  // jumps forward to what's still missing rather than walking the whole flow.
  if (!state.complete) return { ok: true, next: state.step, complete: false };

  await materialize(userId, state.draft, role);
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
  role: MemberRole,
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
            yearsOfExperience: data.yearsOfExperience,
            links: data.links,
            timeZone: data.timeZone,
            updatedAt: new Date(),
            // Interviewer-only: what they can assess.
            ...(role === "interviewer" ? { skills: data.skills } : {}),
            // Optional for candidates, required for interviewers — either way
            // only written when there is something to write.
            ...(data.currentRole ? { currentRole: data.currentRole } : {}),
            // The candidate half. Absent entirely on an interviewer profile.
            ...(role === "candidate"
              ? {
                  candidate: {
                    interviewTypes: data.interviewTypes ?? [],
                    searchStage: data.searchStage ?? "exploring",
                    ...(data.cvUrl ? { cvUrl: data.cvUrl } : {}),
                    ...(data.jobUrl ? { jobUrl: data.jobUrl } : {}),
                    ...(data.focus ? { focus: data.focus } : {}),
                  },
                }
              : {}),
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

  // Seed the schedule with the zone they just chose, so the mirror is correct
  // from the first day rather than from their first profile edit. There are no
  // rules yet, so this writes one small document and generates nothing.
  await syncTimeZone(userId).catch(() => {});

  // Best-effort cleanup; the TTL index sweeps it anyway.
  await drafts()
    .deleteOne({ userId })
    .catch(() => {});
}
