import "server-only";

import type { Collection } from "mongodb";

import { getDb } from "@/server/db/mongo";
import type { Level, ProfileLink } from "@/server/profile/profile";

/**
 * A partially-filled onboarding form.
 *
 * Deliberately a SEPARATE collection from `profile`, not partial writes into
 * it. A half-written profile is indistinguishable from a finished one at query
 * time, so an interviewer who abandoned at step 2 would look listable. Keeping
 * the draft apart means `profile` only ever contains complete records, and the
 * transition happens in one transaction.
 */

export type OnboardingDraft = {
  userId: string;
  data: {
    fullName?: string;
    languages?: string[];
    level?: Level;
    yearsOfExperience?: number;
    currentRole?: { company: string; role: string; current: boolean };
    disciplines?: string[];
    skills?: string[];
    links?: ProfileLink[];
    timeZone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

/** Abandoned drafts are swept after 30 days — long enough to come back to. */
const DRAFT_TTL_SECONDS = 60 * 60 * 24 * 30;

let indexesEnsured = false;

export function drafts(): Collection<OnboardingDraft> {
  const c = getDb().collection<OnboardingDraft>("onboardingDraft");

  if (!indexesEnsured) {
    indexesEnsured = true;
    // Fire-and-forget: index creation must not block the request, and it is
    // idempotent. A failure here is not worth failing the write over.
    void c.createIndex({ userId: 1 }, { unique: true }).catch(() => {});
    void c
      .createIndex({ updatedAt: 1 }, { expireAfterSeconds: DRAFT_TTL_SECONDS })
      .catch(() => {});
  }

  return c;
}
