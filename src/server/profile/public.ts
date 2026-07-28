import "server-only";

import { getDiscipline } from "@/content/skills";
import { hasRole, type Role } from "@/server/auth/auth";
import { findUser } from "@/server/users/users";

import { buildCard, cardNumber, type CardData } from "./card";
import { handleCandidates, normalizeHandle } from "./handle";
import {
  claimHandle,
  findProfileByHandle,
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
  /** The slug this page lives at. Always present — see the gates below. */
  handle: string;
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

  return viewOf(userId, user, profile);
}

/**
 * The same gates, entered from the URL instead of the id. This is the one the
 * page actually calls; the id form stays for the redirect that keeps older
 * links alive.
 */
export async function getPublicInterviewerByHandle(
  handle: string,
): Promise<PublicInterviewer | null> {
  const normalized = normalizeHandle(handle);
  if (!normalized.ok) return null;

  const profile = await findProfileByHandle(normalized.value);
  if (!profile) return null;

  const user = await findUser(profile.userId, { _id: 1, name: 1, role: 1 });
  return viewOf(profile.userId, user, profile);
}

function viewOf(
  userId: string,
  user: { name?: string; role?: string } | null,
  profile: ProfileDoc | null,
): PublicInterviewer | null {
  if (!user || !profile?.publicProfile || !profile.handle) return null;
  if (!hasRole(user.role, "interviewer" as Role)) return null;

  const state = buildCard(
    { id: userId, name: user.name ?? "", isInterviewer: true },
    profile,
  );
  if (!state.ready) return null;

  return {
    handle: profile.handle,
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
  /** Absent until they first publish, which is when one gets allocated. */
  handle?: string;
};

export function visibilityOf(
  user: { id: string; name: string; isInterviewer: boolean },
  profile: ProfileDoc | null,
): VisibilityState {
  return {
    // A page with no handle has no URL, and `viewOf` refuses to render one —
    // so it is not public, whatever the flag says. Reporting it honestly is
    // what makes the switch self-healing: a profile published before handles
    // existed shows as off, and turning it on allocates one.
    isPublic: Boolean(profile?.publicProfile && profile.handle),
    canPublish: user.isInterviewer && buildCard(user, profile).ready,
    handle: profile?.handle,
  };
}

/**
 * Give someone a handle without asking them for one.
 *
 * Called when a page is first published. Walks the candidates in preference
 * order and lets the unique index arbitrate — each attempt is a real write, so
 * two people publishing the same second cannot both win.
 */
async function allocateHandle(
  userId: string,
  name: string,
  cardNo: string,
): Promise<string | null> {
  for (const candidate of handleCandidates(name, cardNo)) {
    if (await claimHandle(userId, candidate)) return candidate;
  }
  return null;
}

export type HandleChange =
  | { ok: true; handle: string }
  | { ok: false; error: string };

/** Rename an existing page. The old URL stops working — say so in the UI. */
export async function changeHandle(
  userId: string,
  desired: unknown,
): Promise<HandleChange> {
  const normalized = normalizeHandle(desired);
  if (!normalized.ok) return normalized;

  const existing = await findProfileByHandle(normalized.value);
  // Their own handle, re-submitted. Not an error, and not a write.
  if (existing?.userId === userId) return { ok: true, handle: normalized.value };

  const claimed = await claimHandle(userId, normalized.value);
  return claimed
    ? { ok: true, handle: normalized.value }
    : { ok: false, error: "That one is taken. Try another." };
}

export type VisibilityResult =
  | { ok: true; isPublic: boolean; handle?: string }
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
  if (!isPublic) {
    await setPublicProfile(user.id, false);
    return { ok: true, isPublic: false };
  }

  const profile = await getProfile(user.id);
  const { canPublish } = visibilityOf(user, profile);
  if (!canPublish)
    return {
      ok: false,
      error: "Finish your card first — that's what the page is made of.",
    };

  // A page with no handle has no URL. Allocate BEFORE flipping the flag, so
  // there is never a moment where the page is "on" and unreachable.
  let handle = profile?.handle;
  if (!handle) {
    handle =
      (await allocateHandle(user.id, user.name, cardNumber(user.id))) ??
      undefined;
    if (!handle)
      return {
        ok: false,
        error: "Couldn't reserve a link for your page. Try again.",
      };
  }

  await setPublicProfile(user.id, true);
  return { ok: true, isPublic: true, handle };
}

/**
 * Every interviewer with a live page, for the sitemap.
 *
 * The `publicProfile` flag narrows it in the query; the gates above are the
 * real answer, so each survivor is re-checked rather than listing a URL that
 * would 404 for the crawler that followed it.
 */
export async function listPublicInterviewers(): Promise<
  { handle: string; updatedAt: Date }[]
> {
  const candidates = await listPublicProfileIds();

  const checked = await Promise.all(
    candidates.map(async (c) => ({
      updatedAt: c.updatedAt ?? new Date(),
      person: await getPublicInterviewer(c.userId),
    })),
  );

  return checked
    .filter((c) => c.person !== null)
    .map(({ person, updatedAt }) => ({ handle: person!.handle, updatedAt }));
}
