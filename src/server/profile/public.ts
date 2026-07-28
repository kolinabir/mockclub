import "server-only";

import { getDiscipline } from "@/content/skills";
import { hasRole, type Role } from "@/server/auth/auth";
import { findUser } from "@/server/users/users";

import { buildCard, type CardData } from "./card";
import {
  getProfile,
  listPublicProfileIds,
  setPublicProfile,
  type ProfileDoc,
  type ProfileLink,
} from "./profile";

/**
 * The public interviewer page.
 *
 * Three gates, all of which must pass, and all of which live HERE rather than
 * in the route — a page is not where "may the open web see this person's face"
 * gets decided, and the same answer has to serve the page, its metadata, its
 * share image and the sitemap:
 *
 *   1. they hold the interviewer role,
 *   2. they turned the page on,
 *   3. the card is finished.
 *
 * (3) is not pedantry. The page IS the card plus context; half a card is a page
 * that says nothing, and a member would rather have no page than a bad one
 * under their own name.
 *
 * What is absent is as deliberate as what is here: no email, no candidate half
 * of the profile, no availability, no session history. A public page is a
 * credential, not a dossier.
 */

export const LEVEL_LABELS: Record<string, string> = {
  entry: "Entry / Junior",
  mid: "Mid-level",
  senior: "Senior",
  switcher: "Career switcher",
};

export type PublicInterviewer = {
  /** The same data the dashboard card is printed from. */
  card: CardData;
  /** "Frontend Engineer at Viralspot AI" — the one-line summary. */
  headline: string;
  level: string;
  yearsOfExperience?: number;
  /** Areas they can assess, resolved to names and notes for display. */
  disciplines: { slug: string; name: string; note: string }[];
  skills: string[];
  /** Their own public profiles. Already validated as http(s) on the way in. */
  links: ProfileLink[];
};

/** Everything the page needs, or null when any gate fails. */
export async function getPublicInterviewer(
  userId: string,
): Promise<PublicInterviewer | null> {
  const [user, profile] = await Promise.all([
    findUser(userId, { _id: 1, name: 1, role: 1 }),
    getProfile(userId),
  ]);

  if (!user || !profile?.publicProfile) return null;
  if (!hasRole(user.role, "interviewer" as Role)) return null;

  const state = buildCard(
    { id: userId, name: user.name ?? "", isInterviewer: true },
    profile,
  );
  if (!state.ready) return null;

  return {
    card: state.data,
    headline: `${state.data.position} at ${state.data.company}`,
    level: LEVEL_LABELS[profile.level] ?? profile.level,
    yearsOfExperience: profile.yearsOfExperience,
    disciplines: (profile.disciplines ?? [])
      .map((slug) => getDiscipline(slug))
      .filter((d) => d !== undefined)
      .map((d) => ({ slug: d.slug, name: d.name, note: d.note })),
    skills: profile.skills ?? [],
    links: profile.links ?? [],
  };
}

/**
 * Whether the signed-in member may turn their page on, and whether it is on.
 * The toggle has to say WHY it's unavailable, which a lone boolean can't.
 */
export type VisibilityState = {
  isPublic: boolean;
  /** False until the card is finished — nothing worth publishing yet. */
  canPublish: boolean;
};

export function visibilityOf(
  user: { id: string; name: string; isInterviewer: boolean },
  profile: ProfileDoc | null,
): VisibilityState {
  return {
    isPublic: Boolean(profile?.publicProfile),
    canPublish: user.isInterviewer && buildCard(user, profile).ready,
  };
}

export type VisibilityResult =
  | { ok: true; isPublic: boolean }
  | { ok: false; error: string };

/**
 * Turning it ON re-checks the gates; turning it OFF never does.
 *
 * Withdrawal must always work. If a rule later tightens, or a photo is removed,
 * someone whose page no longer qualifies must still be able to press the switch
 * that takes it down — a gate on the off-path is a page you cannot unpublish.
 */
export async function setProfileVisibility(
  user: { id: string; name: string; isInterviewer: boolean },
  isPublic: boolean,
): Promise<VisibilityResult> {
  if (isPublic) {
    const { canPublish } = visibilityOf(user, await getProfile(user.id));
    if (!canPublish)
      return {
        ok: false,
        error: "Finish your card first — that's what the page is made of.",
      };
  }

  await setPublicProfile(user.id, isPublic);
  return { ok: true, isPublic };
}

/**
 * Every interviewer with a live page, for the sitemap.
 *
 * The `publicProfile` flag narrows it in the query; the gates above are the
 * real answer, so each survivor is re-checked rather than listing a URL that
 * would 404 for the crawler that followed it.
 */
export async function listPublicInterviewers(): Promise<
  { id: string; updatedAt: Date }[]
> {
  const candidates = await listPublicProfileIds();

  const checked = await Promise.all(
    candidates.map(async (c) => ({
      id: c.userId,
      updatedAt: c.updatedAt ?? new Date(),
      live: Boolean(await getPublicInterviewer(c.userId)),
    })),
  );

  return checked
    .filter((c) => c.live)
    .map(({ id, updatedAt }) => ({ id, updatedAt }));
}
