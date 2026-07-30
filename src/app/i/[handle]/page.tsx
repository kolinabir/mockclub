import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { InterviewerProfile } from "@/components/interviewer-profile";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  getPublicInterviewer,
  getPublicInterviewerByHandle,
  type PublicInterviewer,
} from "@/server/profile/public";

/**
 * An interviewer's public page.
 *
 * Thin on purpose: every gate — role, opt-in, finished card — lives in
 * server/profile/public.ts, because "may the open web see this person's face"
 * is a rule, not a rendering concern, and the same answer has to serve this
 * page, its metadata, its share image and the sitemap. The markup is in
 * components/interviewer-profile.tsx. This file fetches, redirects, and 404s.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ handle: string }> };

/** An ObjectId — i.e. a link from before handles existed. */
const LOOKS_LIKE_ID = /^[0-9a-f]{24}$/i;

/**
 * Resolve the URL segment, and say whether it was the canonical one.
 *
 * The id form is still accepted, because links get pasted into places nobody
 * can edit afterwards and a dead URL is worse than one extra lookup. It is
 * never RENDERED at, though — it redirects, so a page has exactly one address
 * and no search engine is ever asked to pick between two.
 */
async function resolve(
  segment: string,
): Promise<{ person: PublicInterviewer | null; canonical: boolean }> {
  const byHandle = await getPublicInterviewerByHandle(segment);
  if (byHandle) return { person: byHandle, canonical: true };

  if (LOOKS_LIKE_ID.test(segment)) {
    const byId = await getPublicInterviewer(segment.toLowerCase());
    if (byId) return { person: byId, canonical: false };
  }

  return { person: null, canonical: true };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { handle } = await params;
  const { person } = await resolve(handle);

  // A 404 must not advertise itself with a title, and noindex means a page that
  // stops resolving doesn't linger in an index under someone's name.
  if (!person) return { title: "Not found", robots: { index: false } };

  const title = `${person.card.name} — ${person.headline}`;
  const description =
    `${person.card.name} volunteers as a mock interviewer on ${SITE_NAME}: ` +
    `${person.card.track}, ${person.skills.slice(0, 5).join(", ")}. ` +
    `Free practice interviews with real people, in ${person.card.languages.join(" and ")}.`;

  // Canonical is always the handle, even when the page was reached by id.
  return {
    title,
    description,
    alternates: { canonical: `/i/${person.handle}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${SITE_URL}/i/${person.handle}`,
    },
  };
}

export default async function InterviewerPage({ params }: Params) {
  const { handle } = await params;
  const { person, canonical } = await resolve(handle);

  if (!person) notFound();
  if (!canonical) permanentRedirect(`/i/${person.handle}`);

  return (
    <>
      <SiteHeader />
      <InterviewerProfile person={person} />
      <SiteFooter />
    </>
  );
}
