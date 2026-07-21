/**
 * Tracks are content, not UI. They drive the landing page, the sitemap, and
 * (later) one landing page per track — so they live here, not inside a component.
 */

export type Track = {
  /** URL segment. Never change one after it ships — it's a live URL. */
  slug: string;
  name: string;
  /** Short line used on cards. */
  note: string;
  /** <h1> on the track page. Written as a search phrase, not a slogan. */
  headline: string;
  /** Meta description for the track page. 140–160 chars. */
  description: string;
  /** What an interviewer actually assesses. Real content — not keyword filler. */
  covers: string[];
};

export const TRACKS: Track[] = [
  {
    slug: "software-engineering",
    name: "Software Engineering",
    note: "DSA, systems, debugging, take-homes",
    headline: "Free software engineering mock interviews",
    description:
      "Practise coding, system design and debugging interviews with working engineers who run these loops for real. Free, volunteer-run, in your language.",
    covers: [
      "Data structures and algorithms",
      "System design and architecture",
      "Live debugging and code reading",
      "Take-home review and walkthrough",
      "Behavioural and past-project questions",
    ],
  },
  {
    slug: "product-management",
    name: "Product",
    note: "Cases, metrics, prioritisation, exec readouts",
    headline: "Free product management mock interviews",
    description:
      "Practise PM cases, metrics questions and prioritisation with product people who have sat on the hiring side. Free, volunteer-run, in your language.",
    covers: [
      "Product sense and case questions",
      "Metrics, experimentation and analytics",
      "Prioritisation and roadmap defence",
      "Executive communication",
      "Cross-functional conflict stories",
    ],
  },
  {
    slug: "design",
    name: "Design",
    note: "Portfolio walkthrough, critique, whiteboard",
    headline: "Free product design mock interviews",
    description:
      "Practise portfolio walkthroughs, design critique and whiteboard challenges with designers who review candidates for a living. Free and volunteer-run.",
    covers: [
      "Portfolio presentation and narrative",
      "Whiteboard and app critique",
      "Design systems and craft questions",
      "Working with engineers and PMs",
      "Research and validation methods",
    ],
  },
  {
    slug: "data-and-ml",
    name: "Data & ML",
    note: "SQL, stats, modelling, case studies",
    headline: "Free data science and ML mock interviews",
    description:
      "Practise SQL, statistics, modelling and data case studies with practitioners who interview candidates for real. Free, volunteer-run, in your language.",
    covers: [
      "SQL and data manipulation",
      "Statistics and experiment design",
      "Modelling and ML fundamentals",
      "Business case studies",
      "Explaining technical work to non-technical people",
    ],
  },
  {
    slug: "marketing-and-growth",
    name: "Marketing & Growth",
    note: "Channel strategy, campaign teardowns",
    headline: "Free marketing and growth mock interviews",
    description:
      "Practise channel strategy, campaign teardowns and growth cases with marketers who hire. Free, volunteer-run, and available in your language.",
    covers: [
      "Channel strategy and budget allocation",
      "Campaign teardowns and post-mortems",
      "Growth loops and funnel analysis",
      "Positioning and messaging",
      "Reporting to leadership",
    ],
  },
  {
    slug: "founders",
    name: "Founders",
    note: "Pitch practice, investor Q&A, hard questions",
    headline: "Free pitch practice and founder Q&A",
    description:
      "Rehearse your pitch and take the hard investor questions from founders and operators who have been on both sides. Free and volunteer-run.",
    covers: [
      "Pitch delivery and narrative",
      "Investor Q&A under pressure",
      "Market sizing and competition",
      "Traction and metrics defence",
      "Team and hiring questions",
    ],
  },
];

export const getTrack = (slug: string) => TRACKS.find((t) => t.slug === slug);
