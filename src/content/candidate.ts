/**
 * Candidate-side taxonomy.
 *
 * Kept apart from `skills.ts` on purpose: that file describes what an
 * interviewer can ASSESS, this one describes what a candidate WANTS. They meet
 * at matching time, and conflating them is how you end up asking a candidate
 * which technologies they are qualified to grade other people on.
 */

export const INTERVIEW_TYPES = [
  {
    slug: "coding",
    label: "Coding",
    hint: "Data structures, algorithms, live problem solving",
  },
  {
    slug: "system-design",
    label: "System design",
    hint: "Architecture, trade-offs, scale",
  },
  {
    slug: "behavioural",
    label: "Behavioural",
    hint: "Past projects, conflict, ownership — the STAR questions",
  },
  {
    slug: "domain",
    label: "Role-specific",
    hint: "The craft itself: your stack, your domain, your day job",
  },
  {
    slug: "screen",
    label: "CV & screening call",
    hint: "The first conversation with a recruiter or hiring manager",
  },
] as const;

export type InterviewTypeSlug = (typeof INTERVIEW_TYPES)[number]["slug"];
export const INTERVIEW_TYPE_SLUGS = new Set<string>(
  INTERVIEW_TYPES.map((t) => t.slug),
);

/**
 * How far along their search is.
 *
 * One tap, and it is the best prioritisation signal available while interviewer
 * hours are the scarce side — somebody with an onsite next week needs the slot
 * more than somebody browsing.
 */
export const SEARCH_STAGES = [
  {
    slug: "exploring",
    label: "Just exploring",
    hint: "Not applying yet — getting a sense of where I stand",
  },
  {
    slug: "applying",
    label: "Applying now",
    hint: "Sending applications, no interviews booked yet",
  },
  {
    slug: "interviewing",
    label: "Interviewing already",
    hint: "I have real interviews coming up",
  },
  {
    slug: "offer",
    label: "At offer stage",
    hint: "Final rounds or negotiating",
  },
] as const;

export type SearchStageSlug = (typeof SEARCH_STAGES)[number]["slug"];
export const SEARCH_STAGE_SLUGS = new Set<string>(
  SEARCH_STAGES.map((s) => s.slug),
);

/** Free-text cap for "what do you most want help with?". */
export const MAX_FOCUS_LENGTH = 300;

/**
 * Free-text cap for "the job you're aiming at" when it isn't a link.
 * A job title, not a description — the description is what the link is for.
 */
export const MAX_JOB_TARGET_LENGTH = 120;
