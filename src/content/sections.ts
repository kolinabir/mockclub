/** The homepage sections that get their own hash + document title.
 *
 *  Order matters — it must match the render order in `app/page.tsx`, because
 *  the scroll spy picks the last section whose top has passed the reading line.
 *
 *  These titles are set client-side as the reader scrolls, so they are a UX /
 *  shareability affordance (a bookmarked "/#tracks" says what it is), not an
 *  indexing one: Google indexes the homepage as a single document and takes its
 *  title from the server-rendered <title>. Real ranking gains need real routes.
 */
export const HOME_SECTIONS = [
  { id: "gap", title: "Why practice costs so much" },
  { id: "how", title: "How it works" },
  { id: "session", title: "What an hour looks like" },
  { id: "tracks", title: "Interview tracks" },
  { id: "volunteer", title: "Volunteer an hour" },
  { id: "why-free", title: "Why it's free" },
  { id: "faq", title: "FAQ" },
  { id: "join", title: "Join the club" },
] as const;

export type HomeSectionId = (typeof HOME_SECTIONS)[number]["id"];

/** Matches the `template` in the root layout's metadata. */
export const sectionTitle = (title: string) => `${title} · MockClub`;
