import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { generateSlotsForAll } from "@/server/scheduling/scheduling";

/**
 * Nightly slot sweep.
 *
 * Slots are materialised documents covering a rolling HORIZON_DAYS window, and
 * they are only ever (re)generated when a member edits their hours. Without
 * this job an interviewer who sets their week once and never returns silently
 * runs out of bookable hours a month later — the rules still say "Tuesdays
 * 18:00", the search finds nothing, and no error is raised anywhere.
 *
 * Scheduled in vercel.json. Hobby allows one cron run per day, which is all
 * this needs; anything more frequent fails at deploy time (PLAN.md §9).
 */

// Slot generation walks every schedule and writes — never cache the response,
// and never let it run under the static/ISR path.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED. An unset secret must not mean "anyone may trigger this".
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  // Length must match before timingSafeEqual, which throws on differing sizes.
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(req: Request) {
  if (!authorized(req))
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    const result = await generateSlotsForAll();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    // Never leak connection details or stack traces.
    return NextResponse.json({ error: "Sweep failed." }, { status: 500 });
  }
}
