import { NextResponse } from "next/server";

import { addToWaitlist } from "@/server/waitlist/waitlist";

/** Naive per-IP throttle. In-memory, so it resets on redeploy and is per-process
 *  — fine for a launch-scale waitlist; swap for a shared store if it ever grows. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (rateLimited(ip))
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      { status: 429 }
    );

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Bad request." }, { status: 400 });

  // Honeypot: a hidden field only bots fill. Pretend success, store nothing.
  if (typeof body.company === "string" && body.company.trim() !== "")
    return NextResponse.json({ status: "added" });

  try {
    const result = await addToWaitlist({
      contactType: body.contactType,
      contactValue: body.contactValue,
      role: body.role,
      source: "landing",
    });

    if (!result.ok)
      return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ status: result.status });
  } catch {
    // Never leak connection details to the client.
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
