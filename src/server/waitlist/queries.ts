import "server-only";

import { getDb } from "@/server/db/mongo";

/**
 * READ-ONLY ARCHIVE.
 *
 * The waitlist closed when signup opened — the form, the API route and the
 * domain module that wrote these documents are gone. What is left is a few
 * hundred real people who left a contact address before there was an account
 * to make, and the admin panel is the only way to reach them. Nothing writes
 * to this collection any more; do not add a writer, add a member instead.
 */

export type ContactType = "email" | "whatsapp" | "telegram" | "linkedin";

export type WaitlistDoc = {
  contactType: ContactType;
  contactValue: string;
  raw: string;
  role: "candidate" | "interviewer";
  source: string;
  createdAt: Date;
};

export type WaitlistStats = {
  total: number;
  byRole: Record<string, number>;
  byContact: Record<string, number>;
};

export type WaitlistEntry = WaitlistDoc & { _id: string };

/** Counts that decide when booking can open — interviewer supply is the gate. */
export async function getWaitlistStats(): Promise<WaitlistStats> {
  const coll = getDb().collection<WaitlistDoc>("waitlist");
  const [total, roles, contacts] = await Promise.all([
    coll.countDocuments(),
    coll
      .aggregate<{ _id: string; n: number }>([
        { $group: { _id: "$role", n: { $sum: 1 } } },
      ])
      .toArray(),
    coll
      .aggregate<{ _id: string; n: number }>([
        { $group: { _id: "$contactType", n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const toMap = (rows: { _id: string; n: number }[]) =>
    Object.fromEntries(rows.map((r) => [r._id, r.n]));

  return { total, byRole: toMap(roles), byContact: toMap(contacts) };
}

export async function listWaitlist(limit = 200): Promise<WaitlistEntry[]> {
  const rows = await getDb()
    .collection<WaitlistDoc>("waitlist")
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return rows.map((r) => ({ ...r, _id: String(r._id) })) as WaitlistEntry[];
}
