import "server-only";

import { ObjectId } from "mongodb";

import { getDb } from "@/server/db/mongo";

/**
 * Filters for the Better Auth `user` collection.
 *
 * The mongodb adapter maps `_id` -> `id` when it hands a user OUT, but it never
 * stores a separate `id` field. So `{ id }` matches NOTHING — and because
 * updateOne reports success with matchedCount 0, a write with that filter fails
 * silently. That bug shipped twice (onboarding, become-interviewer); this
 * module exists so nobody writes the filter by hand again.
 */

export type UserDoc = {
  _id: ObjectId;
  email: string;
  role?: string;
  onboardedAt?: Date;
  /** When they picked candidate/interviewer — precedes onboardedAt. */
  roleChosenAt?: Date;
  /** Claim marker for the welcome email, so it can only ever send once. */
  welcomeEmailSentAt?: Date;
  name?: string;
};

/** `null` for a malformed id — ObjectId throws on bad input, which would 500. */
export function userFilter(userId: string): { _id: ObjectId } | null {
  if (!ObjectId.isValid(userId)) return null;
  return { _id: new ObjectId(userId) };
}

export function users() {
  return getDb().collection<UserDoc>("user");
}

export async function findUser(
  userId: string,
  projection?: Record<string, 1>,
): Promise<UserDoc | null> {
  const filter = userFilter(userId);
  if (!filter) return null;
  return users().findOne(filter, projection ? { projection } : undefined);
}

/**
 * Applies `$set` to a user. Throws when nothing matched, so a silently-lost
 * write surfaces instead of looking like success.
 */
export async function updateUser(
  userId: string,
  set: Partial<UserDoc>,
): Promise<void> {
  const filter = userFilter(userId);
  if (!filter) throw new Error("updateUser: malformed user id");

  const res = await users().updateOne(filter, { $set: set });
  if (res.matchedCount === 0) throw new Error("updateUser: no user matched");
}

/* ---------------------------------------------------------------------------
 * Display name.
 *
 * Google supplies one at sign-up, and for most people that is the end of it.
 * But it is the ONLY field on a member's card that came from somewhere else —
 * a legal name, a maiden name, a name in the wrong script — and it is the line
 * a candidate reads first. So it has to be editable.
 *
 * Safe to edit: `overrideUserInfoOnSignIn` is not set on the Google provider
 * (server/auth/auth.ts), and Better Auth only rewrites `name` from the profile
 * when it is. Signing in again does not undo this.
 * ------------------------------------------------------------------------- */

export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 60;

export type NameResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Characters removed outright rather than rejected.
 *
 * Not tidiness. This string is rendered beside other people's text on a card
 * and in the dashboard, and RTL is enabled site-wide (Arabic, Urdu) — an
 * unbalanced bidi override (U+202E and its neighbours) doesn't just style the
 * name, it reverses everything drawn after it. Zero-width characters and C0/C1
 * controls go for the same reason: they are invisible padding, used to pass off
 * one name as another.
 */
const INVISIBLE = new RegExp(
  "[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F" +
    "\\u202A-\\u202E\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]",
  "g",
);

/** Pure, so the rule is testable without a database. */
export function normalizeDisplayName(v: unknown): NameResult {
  if (typeof v !== "string") return { ok: false, error: "Add your name." };

  const name = v.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();

  if (!name) return { ok: false, error: "Add your name." };
  if (name.length < MIN_NAME_LENGTH)
    return { ok: false, error: "That name is too short." };
  if (name.length > MAX_NAME_LENGTH)
    return {
      ok: false,
      error: `Keep your name under ${MAX_NAME_LENGTH} characters.`,
    };
  // Punctuation on its own is not a name, and "---" would print as one.
  if (!/[\p{L}\p{N}]/u.test(name))
    return { ok: false, error: "That doesn't look like a name." };

  return { ok: true, value: name };
}

export async function setDisplayName(
  userId: string,
  raw: unknown,
): Promise<NameResult> {
  const result = normalizeDisplayName(raw);
  if (!result.ok) return result;

  await updateUser(userId, { name: result.value });
  return result;
}
