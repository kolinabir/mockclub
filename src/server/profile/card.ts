import "server-only";

import { createHash } from "node:crypto";

import { getTrack, OTHER_TRACK_SLUG } from "@/content/tracks";

import type { ProfileDoc } from "./profile";

/**
 * The interviewer card.
 *
 * A card is NOT a new place to store things. Every line on it is a field the
 * profile already carries — name, photo, current role, track, skills,
 * languages, time zone — so this module is only the join: which fields the card
 * shows, what is still missing before it can be printed, and the one derived
 * value (the number) that has nowhere else to live.
 *
 * Kept in server/ rather than next to the component because "is this card
 * complete?" is a rule, not a rendering detail — the same answer will decide
 * whether a card can be shown to a matched candidate later, and that decision
 * must not live inside a JSX file.
 */

/** Every line on the card, keyed. Used for the missing-fields list. */
export type CardFieldKey =
  | "interviewer"
  | "photo"
  | "role"
  | "track"
  | "skills"
  | "languages"
  | "timeZone";

export type CardRequirement = {
  key: CardFieldKey;
  label: string;
  done: boolean;
};

/**
 * What the card renders. Placeholder strings stand in for anything missing, so
 * the locked state can show a real card SHAPE behind the blur instead of a
 * half-empty skeleton — the point of that screen is "here is the thing you
 * don't have yet", and an outline of it says that better than gaps do.
 */
export type CardData = {
  no: string;
  name: string;
  position: string;
  company: string;
  /** Empty when unset — the component picks its track icon from this. */
  trackSlug: string;
  track: string;
  skills: string[];
  languages: string[];
  /** IANA id. The component turns it into a label via lib/time. */
  timeZone: string;
  /** R2 object key, never a URL. Null until a photo is uploaded. */
  photoKey: string | null;
};

export type CardState = {
  /** True only when every requirement is met — the gate on the card page. */
  ready: boolean;
  requirements: CardRequirement[];
  data: CardData;
};

/**
 * A member's card number. Stable for the life of the account.
 *
 * Derived from the user id rather than a counter on purpose: a sequential
 * number would print how few people had signed up before you, which is exactly
 * the wrong thing for a card to advertise while the club is small. Five digits,
 * zero-padded, so every card is the same width.
 */
export function cardNumber(userId: string): string {
  const digest = createHash("sha256")
    .update(`mockclub:card:${userId}`)
    .digest();
  return String(digest.readUInt32BE(0) % 100_000).padStart(5, "0");
}

/**
 * How many skills a card can carry before it stops being a card.
 *
 * Four, not the profile cap of twenty. Skill names are long ("Data structures
 * & algorithms"), and the card gives the stack two lines beside a fixed-height
 * photo — six of them turned the block into a paragraph and pushed the name
 * clear off the top of the plate. The full list is on the public page.
 */
export const MAX_CARD_SKILLS = 4;

/**
 * The tech-stack LINE, bounded to what fits two lines beside the photo.
 *
 * A character budget rather than a CSS clamp, because the card is drawn twice —
 * in the browser and by the PNG renderer, which ignores `line-clamp` — and the
 * two must not show different text. It works in both because every size on the
 * card is a fraction of its width, so characters-per-line is the same whatever
 * the card is scaled to.
 *
* Cut on a word boundary: a half-word before an ellipsis reads as a bug. The
 * budget is two lines at roughly eighteen characters each, measured — set it
 * higher and the CSS clamp on the card starts trimming further than the PNG
 * does, which is the exact divergence this constant exists to prevent.
 */
export const STACK_MAX_CHARS = 34;

export function stackLine(skills: string[]): string {
  const text = skills.join(", ");
  if (text.length <= STACK_MAX_CHARS) return text;

  const cut = text.slice(0, STACK_MAX_CHARS);
  const at = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","));
  const kept = at > STACK_MAX_CHARS * 0.6 ? cut.slice(0, at) : cut;
  return `${kept.replace(/[,\s]+$/, "")}…`;
}

function trackName(profile: ProfileDoc | null): string | undefined {
  if (!profile?.trackSlug) return undefined;
  if (profile.trackSlug === OTHER_TRACK_SLUG)
    return profile.customTrack?.trim() || undefined;
  return getTrack(profile.trackSlug)?.name;
}

/**
 * Build the card, and say what is still missing.
 *
 * Pure: takes the session user and the profile document, returns both the
 * printable data and the checklist. No database, no request — so the rule is
 * testable and the page stays thin.
 */
export function buildCard(
  user: { id: string; name: string; isInterviewer: boolean },
  profile: ProfileDoc | null,
): CardState {
  const track = trackName(profile);
  const role = profile?.currentRole;
  const skills = profile?.skills ?? [];
  const languages = profile?.languages ?? [];

  const requirements: CardRequirement[] = [
    {
      // First, because nothing below it is collected for a candidate — the
      // photo upload is refused server-side for anyone without this role.
      key: "interviewer",
      label: "Volunteering as an interviewer",
      done: user.isInterviewer,
    },
    {
      key: "photo",
      label: "A professional photo",
      done: Boolean(profile?.photo?.key),
    },
    {
      key: "role",
      label: "Your job title and where you work",
      done: Boolean(role?.role?.trim() && role?.company?.trim()),
    },
    {
      key: "track",
      label: "The track you interview for",
      done: Boolean(track),
    },
    {
      key: "skills",
      label: "The skills you can assess",
      done: skills.length > 0,
    },
    {
      key: "languages",
      label: "Languages you can interview in",
      done: languages.length > 0,
    },
    {
      key: "timeZone",
      label: "Your time zone",
      done: Boolean(profile?.timeZone),
    },
  ];

  return {
    ready: requirements.every((r) => r.done),
    requirements,
    data: {
      no: cardNumber(user.id),
      name: user.name?.trim() || "Your name",
      position: role?.role?.trim() || "Your job title",
      company: role?.company?.trim() || "Your company",
      trackSlug: profile?.trackSlug ?? "",
      track: track ?? "Your track",
      skills: skills.length ? skills.slice(0, MAX_CARD_SKILLS) : ["Your stack"],
      languages: languages.length ? languages : ["Your languages"],
      // A real zone, so the locked preview formats an offset like a real card
      // rather than showing an error string under the blur.
      timeZone: profile?.timeZone || "UTC",
      photoKey: profile?.photo?.key ?? null,
    },
  };
}
