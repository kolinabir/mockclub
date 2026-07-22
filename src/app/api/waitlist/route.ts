import { NextResponse } from "next/server";

import { clientIp, rateLimit } from "@/server/rate-limit";
import { addToWaitlist } from "@/server/waitlist/waitlist";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  // Two layers, because per-IP limiting alone is NOT trustworthy: a client can
  // forge `x-forwarded-for`, and rotating it defeats any per-IP cap (verified —
  // 10/10 requests bypassed a 6/min limit). So the per-IP rule handles ordinary
  // abuse, and a global cap bounds what spoofing can achieve.
  const [perIp, global] = await Promise.all([
    rateLimit(`waitlist:ip:${ip}`, { max: 6, windowSeconds: 60 }),
    rateLimit("waitlist:global", { max: 40, windowSeconds: 60 }),
  ]);

  if (perIp.limited || global.limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a minute." },
      { status: 429 }
    );
  }

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
    // Never leak connection details or stack traces to the client.
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
