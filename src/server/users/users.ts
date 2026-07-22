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
