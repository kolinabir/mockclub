import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InterviewerProfile } from "@/components/interviewer-profile";
import { SiteFooter } from "@/components/sections/site-footer";
import { SiteHeader } from "@/components/sections/site-header";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getPublicInterviewer } from "@/server/profile/public";

/**
 * An interviewer's public page.
 *
 * Thin on purpose: every gate — role, opt-in, finished card — lives in
 * server/profile/public.ts, because "may the open web see this person's face"
 * is a rule, not a rendering concern, and the same answer has to serve this
 * page, its metadata, its share image and the sitemap. The markup is in
 * components/interviewer-profile.tsx. This file fetches, and 404s.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const person = await getPublicInterviewer(id);

  // A 404 must not advertise itself with a title, and noindex means a page that
  // stops resolving doesn't linger in an index under someone's name.
  if (!person) return { title: "Not found", robots: { index: false } };

  const title = `${person.card.name} — ${person.headline}`;
  const description =
    `${person.card.name} volunteers as a mock interviewer on ${SITE_NAME}: ` +
    `${person.card.track}, ${person.skills.slice(0, 5).join(", ")}. ` +
    `Free practice interviews with real people, in ${person.card.languages.join(" and ")}.`;

  return {
    title,
    description,
    alternates: { canonical: `/interviewers/${id}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: `${SITE_URL}/interviewers/${id}`,
    },
  };
}

export default async function InterviewerPage({ params }: Params) {
  const { id } = await params;
  const person = await getPublicInterviewer(id);
  if (!person) notFound();

  return (
    <>
      <SiteHeader />
      <InterviewerProfile person={person} />
      <SiteFooter />
    </>
  );
}
