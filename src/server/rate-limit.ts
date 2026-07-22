import "server-only";

import { getDb } from "@/server/db/mongo";

/**
 * Shared, atomic rate limiter backed by MongoDB.
 *
 * Replaces an in-memory `Map`, which was broken two ways:
 *   1. On serverless every instance had its OWN Map, so the real limit was
 *      (instances × max) — an attacker just fanned out across instances.
 *   2. It never evicted entries, so on a long-lived process it grew unbounded.
 *
 * Fixed-window counter: the doc id embeds the window bucket, so a new window
 * starts a new doc, and a TTL index sweeps the old ones.
 */

const COLLECTION = "rateLimit";

type Bucket = { _id: string; count: number; expiresAt: Date };

let ttlEnsured = false;

async function buckets() {
  const c = getDb().collection<Bucket>(COLLECTION);
  if (!ttlEnsured) {
    // expireAfterSeconds: 0 → Mongo deletes each doc once expiresAt passes.
    await c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    ttlEnsured = true;
  }
  return c;
}

export type RateLimitResult = { limited: boolean; remaining: number };

export async function rateLimit(
  key: string,
  { max, windowSeconds }: { max: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const id = `${key}:${bucket}`;

  try {
    const c = await buckets();
    // $inc is atomic server-side, so concurrent requests can't race past the cap.
    const doc = await c.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
      },
      { upsert: true, returnDocument: "after" },
    );

    const count = doc?.count ?? 1;
    return { limited: count > max, remaining: Math.max(0, max - count) };
  } catch {
    // Fail OPEN: a limiter outage must not take the signup form down. The
    // honeypot and validation still apply.
    return { limited: false, remaining: max };
  }
}

/**
 * Client IP, resistant to header spoofing.
 *
 * `x-forwarded-for` is APPENDED to by proxies, so if a client sends their own
 * the header becomes "<client-supplied>, <real-ip>". Reading the LEFTMOST value
 * — the usual advice, and what this used to do — therefore reads attacker-
 * controlled data: rotating it defeats the rate limit entirely (verified: 10/10
 * requests bypassed a 6/min cap).
 *
 * So: prefer headers our own platform sets (which a client cannot forge), and
 * only fall back to `x-forwarded-for` reading the RIGHTMOST value — the entry
 * appended by the proxy closest to us.
 */
export function clientIp(headers: Headers): string {
  // Set by Vercel's edge; not settable by the client.
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) return vercel.split(",")[0].trim();

  // Set by our own reverse proxy (Caddy/nginx) on the VPS path.
  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    // Rightmost = added by the nearest trusted proxy.
    if (parts.length) return parts[parts.length - 1];
  }

  return "unknown";
}
