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
  {
    slug: "devops-and-cloud",
    name: "DevOps & Cloud",
    note: "CI/CD, infra, incidents, on-call",
    headline: "Free DevOps and cloud mock interviews",
    description:
      "Practise infrastructure design, CI/CD, incident response and on-call scenarios with engineers who run production systems. Free and volunteer-run.",
    covers: [
      "Infrastructure and cloud architecture",
      "CI/CD pipelines and automation",
      "Incident response and debugging under pressure",
      "Monitoring, alerting and reliability",
      "Cost and scaling trade-offs",
    ],
  },
  {
    slug: "mobile-engineering",
    name: "Mobile Engineering",
    note: "iOS, Android, cross-platform, app architecture",
    headline: "Free mobile engineering mock interviews",
    description:
      "Practise iOS, Android and cross-platform interviews — architecture, performance and platform specifics — with mobile engineers who hire. Free, volunteer-run.",
    covers: [
      "App architecture and state management",
      "Platform-specific APIs and constraints",
      "Performance, memory and battery",
      "Offline behaviour and sync",
      "Release, review and rollout process",
    ],
  },
  {
    slug: "qa-and-testing",
    name: "QA & Testing",
    note: "Test strategy, automation, edge cases",
    headline: "Free QA and test engineering mock interviews",
    description:
      "Practise test strategy, automation frameworks and edge-case thinking with QA engineers who interview candidates for real. Free and volunteer-run.",
    covers: [
      "Test strategy and coverage decisions",
      "Automation frameworks and flakiness",
      "Finding edge cases others miss",
      "Bug reporting and reproduction",
      "Working with engineers on quality",
    ],
  },
  {
    slug: "security",
    name: "Security",
    note: "AppSec, threat modelling, incident handling",
    headline: "Free security engineering mock interviews",
    description:
      "Practise application security, threat modelling and incident handling with security practitioners. Free, volunteer-run, in your language.",
    covers: [
      "Threat modelling and risk assessment",
      "Common vulnerability classes",
      "Secure design and code review",
      "Incident detection and response",
      "Explaining risk to non-security people",
    ],
  },
  {
    slug: "sales",
    name: "Sales",
    note: "Discovery calls, objections, pipeline",
    headline: "Free sales interview practice",
    description:
      "Practise discovery calls, objection handling and pipeline questions with people who have carried a quota and hired for it. Free and volunteer-run.",
    covers: [
      "Discovery and qualification",
      "Objection handling and negotiation",
      "Pipeline and forecast questions",
      "Mock pitch and demo",
      "Territory and target storytelling",
    ],
  },
  {
    slug: "project-management",
    name: "Project & Program",
    note: "Delivery, stakeholders, risk, comms",
    headline: "Free project and program management mock interviews",
    description:
      "Practise delivery, stakeholder management and risk questions with PMs and program leads who run these loops. Free, volunteer-run.",
    covers: [
      "Delivery planning and trade-offs",
      "Stakeholder and conflict management",
      "Risk identification and mitigation",
      "Status communication to leadership",
      "Post-mortems and process improvement",
    ],
  },
];

/** Escape hatch when none of the tracks fit — the member types their own. */
export const OTHER_TRACK_SLUG = "other";

export const getTrack = (slug: string) => TRACKS.find((t) => t.slug === slug);
