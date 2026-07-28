import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { listPublicInterviewers } from "@/server/profile/public";

/**
 * Public interviewer pages are listed; nothing else about a member is.
 *
 * They earn it: each is a real person's own account of work they actually do,
 * which is the opposite of the thin generated pages a sitemap usually gets
 * stuffed with — and every URL here is one someone deliberately switched on.
 * The list is re-checked against the same gates as the page, so a crawler is
 * never sent to a 404.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Never fail the whole sitemap over the database. One missing section still
  // gets the site indexed; a 500 gets nothing indexed.
  let interviewers: { handle: string; updatedAt: Date }[] = [];
  try {
    interviewers = await listPublicInterviewers();
  } catch {
    interviewers = [];
  }

  // Per-track pages ship in M4 (see PLAN.md). They are deliberately NOT listed
  // yet — submitting URLs that 404, or that exist but are thin, is worse for
  // ranking than not having them at all.
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...interviewers.map((i) => ({
      url: `${SITE_URL}/interviewers/${i.handle}`,
      lastModified: i.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
