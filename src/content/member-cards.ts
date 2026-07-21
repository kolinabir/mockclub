/**
 * Hero carousel cards.
 *
 * These double as SEO content: each card puts a track name, a real language and
 * a real IANA timezone into the server-rendered HTML, which is exactly the
 * "any role, any language" claim the page makes. `trackSlug` matches
 * `src/content/tracks.ts`, so the same rows can seed /practice/[track] later.
 */

export type MemberCardData = {
  /** Membership number. Deliberately non-sequential so no card looks like "the
   *  first user" — these are illustrative, not a live count. */
  no: string;
  role: string;
  trackSlug: string;
  track: string;
  level: string;
  language: string;
  timezone: string;
};

export const MEMBER_CARDS: MemberCardData[] = [
  {
    no: "204873",
    role: "Backend Engineer",
    trackSlug: "software-engineering",
    track: "Software Engineering",
    level: "Entry / Junior",
    language: "বাংলা · English",
    timezone: "Asia/Dhaka (GMT+6)",
  },
  {
    no: "391045",
    role: "Product Manager",
    trackSlug: "product-management",
    track: "Product",
    level: "Mid-level",
    language: "Español · English",
    timezone: "America/Bogota (GMT−5)",
  },
  {
    no: "118662",
    role: "Growth Marketer",
    trackSlug: "marketing-and-growth",
    track: "Marketing & Growth",
    level: "Entry / Junior",
    language: "हिन्दी · English",
    timezone: "Asia/Kolkata (GMT+5:30)",
  },
  {
    no: "570319",
    role: "Product Designer",
    trackSlug: "design",
    track: "Design",
    level: "Mid-level",
    language: "Português · English",
    timezone: "America/Sao_Paulo (GMT−3)",
  },
  {
    no: "442087",
    role: "Data Scientist",
    trackSlug: "data-and-ml",
    track: "Data & ML",
    level: "Career switcher",
    language: "Tiếng Việt · English",
    timezone: "Asia/Ho_Chi_Minh (GMT+7)",
  },
  {
    no: "826134",
    role: "First-time Founder",
    trackSlug: "founders",
    track: "Founders",
    level: "Pre-seed",
    language: "العربية · English",
    timezone: "Africa/Cairo (GMT+2)",
  },
];
