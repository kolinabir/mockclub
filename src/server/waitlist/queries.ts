import "server-only";

import { getDb } from "@/server/db/mongo";

import type { WaitlistDoc } from "./waitlist";

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
