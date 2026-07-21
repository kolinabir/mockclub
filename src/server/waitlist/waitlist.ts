import "server-only";

import type { Collection } from "mongodb";

import { getDb } from "@/server/db/mongo";

/**
 * Waitlist domain logic. A visitor submits ONE contact method of their choice —
 * their email, WhatsApp number, Telegram handle, or LinkedIn — and we store it
 * so the team can reach out. All validation/normalisation lives here; the route
 * stays thin. No `next/*` import (server/ boundary).
 */

export const CONTACT_TYPES = ["email", "whatsapp", "telegram", "linkedin"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const WAITLIST_ROLES = ["candidate", "interviewer"] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];

export type WaitlistDoc = {
  contactType: ContactType;
  contactValue: string; // normalised — the dedupe key with contactType
  raw: string; // exactly what they typed, for display
  role: WaitlistRole;
  source: string;
  createdAt: Date;
};

export type AddResult =
  | { ok: true; status: "added" | "already" }
  | { ok: false; error: string };

/** Normalise + validate a contact value for its type. */
export function normalizeContact(
  type: ContactType,
  raw: string
): { ok: true; value: string } | { ok: false; error: string } {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Please enter your contact." };

  switch (type) {
    case "email": {
      const v = input.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
        return { ok: false, error: "That doesn't look like a valid email." };
      return { ok: true, value: v };
    }
    case "whatsapp": {
      // Accept a wa.me link or a phone number in any common format.
      const fromLink = input.match(/wa\.me\/(\+?\d[\d\s\-()]*)/i)?.[1] ?? input;
      const digits = fromLink.replace(/[^\d]/g, "");
      if (digits.length < 8 || digits.length > 15)
        return { ok: false, error: "Enter a valid WhatsApp number with country code." };
      return { ok: true, value: `+${digits}` };
    }
    case "telegram": {
      // Accept @handle, handle, or a t.me/handle link.
      const handle = (input.match(/t\.me\/([^/\s?]+)/i)?.[1] ?? input)
        .replace(/^@/, "")
        .toLowerCase();
      if (!/^[a-z0-9_]{5,32}$/.test(handle))
        return { ok: false, error: "Enter a valid Telegram handle (5–32 letters, digits, _)." };
      return { ok: true, value: `@${handle}` };
    }
    case "linkedin": {
      // Accept a full URL, in/slug, or a bare slug.
      const slug = (input.match(/linkedin\.com\/in\/([^/\s?]+)/i)?.[1] ??
        input.replace(/^.*\/in\//i, "").replace(/^@/, ""))
        .replace(/\/+$/, "")
        .toLowerCase();
      if (!/^[a-z0-9\-À-ÿ_%.]{3,100}$/.test(slug))
        return { ok: false, error: "Enter your LinkedIn profile URL or handle." };
      return { ok: true, value: `linkedin.com/in/${slug}` };
    }
  }
}

let indexesEnsured = false;
async function collection(): Promise<Collection<WaitlistDoc>> {
  const c = (await getDb()).collection<WaitlistDoc>("waitlist");
  if (!indexesEnsured) {
    // One person, one entry per contact method. Re-submitting is "already in",
    // not an error.
    await c.createIndex({ contactType: 1, contactValue: 1 }, { unique: true });
    indexesEnsured = true;
  }
  return c;
}

export async function addToWaitlist(input: {
  contactType: unknown;
  contactValue: unknown;
  role: unknown;
  source?: string;
}): Promise<AddResult> {
  const { contactType, contactValue, role } = input;

  if (!CONTACT_TYPES.includes(contactType as ContactType))
    return { ok: false, error: "Pick how we should reach you." };
  if (!WAITLIST_ROLES.includes(role as WaitlistRole))
    return { ok: false, error: "Tell us whether you want to practise or give an hour." };
  if (typeof contactValue !== "string")
    return { ok: false, error: "Please enter your contact." };

  const normalized = normalizeContact(contactType as ContactType, contactValue);
  if (!normalized.ok) return normalized;

  const doc: WaitlistDoc = {
    contactType: contactType as ContactType,
    contactValue: normalized.value,
    raw: contactValue.trim().slice(0, 200),
    role: role as WaitlistRole,
    source: input.source?.slice(0, 40) ?? "landing",
    createdAt: new Date(),
  };

  try {
    const c = await collection();
    await c.insertOne(doc);
    return { ok: true, status: "added" };
  } catch (err: unknown) {
    if (typeof err === "object" && err && (err as { code?: number }).code === 11000)
      return { ok: true, status: "already" };
    throw err;
  }
}
