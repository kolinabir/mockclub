/**
 * Skill taxonomy: Track -> Discipline -> Skills.
 *
 * Content, not UI — same reasoning as tracks.ts. It drives onboarding today and
 * interviewer matching later, so it must not live inside a component.
 *
 * Seeded from the 2025 Stack Overflow Developer Survey (49k responses, 314
 * technologies) rather than invented, and ordered by real usage so the common
 * answer is the first thing a tired volunteer sees. Deep on tech for now; the
 * non-tech tracks in tracks.ts stay coarse until they have interviewers.
 */

/**
 * Which background a discipline belongs to. MockClub is explicitly not a
 * dev-only platform — the homepage promises founders, marketers, designers and
 * more — so the taxonomy has to carry them too, not just engineering.
 */
export const FIELDS = [
  {
    slug: "tech",
    name: "Engineering & Tech",
    note: "Software, data, infra, security",
  },
  { slug: "product", name: "Product", note: "PM, product sense, metrics" },
  { slug: "design", name: "Design", note: "Product design, UX research" },
  {
    slug: "marketing",
    name: "Marketing & Growth",
    note: "Channels, campaigns, growth",
  },
  { slug: "sales", name: "Sales", note: "Discovery, objections, pipeline" },
  { slug: "founder", name: "Founder", note: "Pitch, investors, fundraising" },
  {
    slug: "operations",
    name: "Project & Program",
    note: "Delivery, stakeholders, risk",
  },
] as const;

export type FieldSlug = (typeof FIELDS)[number]["slug"];

export type Discipline = {
  /** URL-safe id. Never change one after it ships — it's stored on profiles. */
  slug: string;
  name: string;
  /** Background this sits under — drives the branch in onboarding step 3. */
  family: FieldSlug;
  /** Which track in tracks.ts this belongs to. */
  trackSlug: string;
  /** Short line shown under the name while choosing. */
  note: string;
  skills: string[];
};

export const DISCIPLINES: Discipline[] = [
  {
    slug: "frontend",
    name: "Frontend",
    family: "tech",
    trackSlug: "software-engineering",
    note: "Interfaces, state, browser performance",
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Next.js",
      "Vue",
      "Nuxt",
      "Angular",
      "Svelte",
      "SvelteKit",
      "Astro",
      "HTML/CSS",
      "Tailwind CSS",
      "Redux",
      "React Native",
      "Accessibility",
      "Web performance",
      "Testing (Jest/Vitest)",
    ],
  },
  {
    slug: "backend",
    name: "Backend",
    family: "tech",
    trackSlug: "software-engineering",
    note: "APIs, services, data modelling",
    skills: [
      "Node.js",
      "Python",
      "Go",
      "Java",
      "C#/.NET",
      "PHP",
      "Ruby",
      "Rust",
      "Express",
      "NestJS",
      "Django",
      "FastAPI",
      "Flask",
      "Spring Boot",
      "Laravel",
      "Rails",
      "GraphQL",
      "REST API design",
      "gRPC",
      "Microservices",
      "Message queues",
      "Caching",
    ],
  },
  {
    slug: "fullstack",
    name: "Full-stack",
    family: "tech",
    trackSlug: "software-engineering",
    note: "End to end, front and back",
    skills: [
      "Next.js",
      "Remix",
      "T3 stack",
      "MERN",
      "Django + React",
      "Laravel + Vue",
      "Rails + Hotwire",
      "Supabase",
      "Firebase",
      "tRPC",
      "Prisma",
      "Drizzle",
    ],
  },
  {
    slug: "mobile",
    name: "Mobile",
    family: "tech",
    trackSlug: "mobile-engineering",
    note: "iOS, Android, cross-platform",
    skills: [
      "Swift",
      "SwiftUI",
      "Kotlin",
      "Jetpack Compose",
      "React Native",
      "Flutter",
      "Dart",
      "Objective-C",
      "Android SDK",
      "iOS SDK",
      "App Store release",
      "Offline sync",
      "Mobile performance",
    ],
  },
  {
    slug: "devops",
    name: "DevOps & Cloud",
    family: "tech",
    trackSlug: "devops-and-cloud",
    note: "Infra, pipelines, reliability",
    skills: [
      "Docker",
      "Kubernetes",
      "AWS",
      "Google Cloud",
      "Azure",
      "Terraform",
      "Ansible",
      "CI/CD",
      "GitHub Actions",
      "Jenkins",
      "Linux",
      "Nginx",
      "Monitoring & alerting",
      "Incident response",
      "SRE practices",
      "Cloudflare",
    ],
  },
  {
    slug: "data",
    name: "Data & ML",
    family: "tech",
    trackSlug: "data-and-ml",
    note: "Pipelines, analysis, models",
    skills: [
      "SQL",
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "Redis",
      "Python",
      "pandas",
      "NumPy",
      "scikit-learn",
      "PyTorch",
      "TensorFlow",
      "Spark",
      "Airflow",
      "dbt",
      "Snowflake",
      "BigQuery",
      "Data modelling",
      "Statistics",
      "A/B testing",
      "LLMs & RAG",
    ],
  },
  {
    slug: "qa",
    name: "QA & Testing",
    family: "tech",
    trackSlug: "qa-and-testing",
    note: "Test strategy and automation",
    skills: [
      "Manual testing",
      "Test automation",
      "Selenium",
      "Cypress",
      "Playwright",
      "Appium",
      "JMeter",
      "k6",
      "API testing",
      "Performance testing",
      "Test strategy",
      "Bug triage",
    ],
  },
  {
    slug: "security",
    name: "Security",
    family: "tech",
    trackSlug: "security",
    note: "AppSec, threat modelling, response",
    skills: [
      "Application security",
      "Penetration testing",
      "Threat modelling",
      "OWASP Top 10",
      "Cryptography",
      "Identity & access",
      "Cloud security",
      "Incident response",
      "Secure code review",
      "Compliance",
    ],
  },
  {
    slug: "systems",
    name: "Systems & Embedded",
    family: "tech",
    trackSlug: "software-engineering",
    note: "Low level, performance, devices",
    skills: [
      "C",
      "C++",
      "Rust",
      "Assembly",
      "Embedded Linux",
      "RTOS",
      "Firmware",
      "Device drivers",
      "Networking",
      "Operating systems",
      "Compilers",
    ],
  },
  {
    slug: "engineering-craft",
    name: "Engineering craft",
    family: "tech",
    trackSlug: "software-engineering",
    note: "The parts every loop tests",
    skills: [
      "Data structures & algorithms",
      "System design",
      "Object-oriented design",
      "Debugging",
      "Code review",
      "Git",
      "Refactoring",
      "Testing strategy",
      "Take-home review",
      "Behavioural interviews",
      "Technical communication",
    ],
  },
  {
    slug: "product-management",
    name: "Product Management",
    family: "product",
    trackSlug: "product-management",
    note: "Cases, metrics, prioritisation",
    skills: [
      "Product sense",
      "Case interviews",
      "Metrics & analytics",
      "A/B testing",
      "Prioritisation",
      "Roadmapping",
      "User research",
      "Go-to-market",
      "Stakeholder management",
      "Executive communication",
      "Technical fluency",
    ],
  },
  {
    slug: "product-design",
    name: "Product Design",
    family: "design",
    trackSlug: "design",
    note: "Portfolio, critique, whiteboard",
    skills: [
      "Portfolio walkthrough",
      "Design critique",
      "Whiteboard challenge",
      "Interaction design",
      "Visual design",
      "Design systems",
      "Figma",
      "Prototyping",
      "Accessibility",
      "Working with engineers",
    ],
  },
  {
    slug: "ux-research",
    name: "UX Research",
    family: "design",
    trackSlug: "design",
    note: "Interviews, testing, synthesis",
    skills: [
      "User interviews",
      "Usability testing",
      "Survey design",
      "Research synthesis",
      "Journey mapping",
      "Presenting findings",
    ],
  },
  {
    slug: "marketing",
    name: "Marketing & Growth",
    family: "marketing",
    trackSlug: "marketing-and-growth",
    note: "Channels, campaigns, funnels",
    skills: [
      "Channel strategy",
      "Paid acquisition",
      "SEO",
      "Content marketing",
      "Email & lifecycle",
      "Campaign teardowns",
      "Brand & positioning",
      "Analytics & attribution",
      "Growth loops",
      "Funnel analysis",
      "Reporting to leadership",
    ],
  },
  {
    slug: "sales",
    name: "Sales",
    family: "sales",
    trackSlug: "sales",
    note: "Discovery, objections, pipeline",
    skills: [
      "Discovery calls",
      "Qualification (MEDDIC/BANT)",
      "Objection handling",
      "Negotiation",
      "Demo & pitch",
      "Pipeline & forecasting",
      "Cold outreach",
      "Account management",
      "Territory planning",
    ],
  },
  {
    slug: "founder",
    name: "Founder",
    family: "founder",
    trackSlug: "founders",
    note: "Pitch, investor Q&A, traction",
    skills: [
      "Pitch delivery",
      "Investor Q&A",
      "Fundraising narrative",
      "Market sizing",
      "Competition & moat",
      "Traction & metrics",
      "Business model",
      "Hiring & team",
    ],
  },
  {
    slug: "project-management",
    name: "Project & Program",
    family: "operations",
    trackSlug: "project-management",
    note: "Delivery, risk, stakeholders",
    skills: [
      "Delivery planning",
      "Agile & Scrum",
      "Risk management",
      "Stakeholder management",
      "Status reporting",
      "Budget & resourcing",
      "Post-mortems",
      "Vendor management",
    ],
  },
];

/** Cap on custom skills, so the field can't be used as free storage. */
export const MAX_SKILLS = 20;
export const MAX_CUSTOM_SKILL_LENGTH = 40;

export const DISCIPLINE_SLUGS = new Set(DISCIPLINES.map((d) => d.slug));

export const disciplinesInFields = (fields: string[]) =>
  DISCIPLINES.filter((d) => fields.includes(d.family));

/** The fields implied by a set of disciplines — used to restore step 3 state. */
export const fieldsOf = (slugs: string[]) => [
  ...new Set(
    DISCIPLINES.filter((d) => slugs.includes(d.slug)).map((d) => d.family),
  ),
];

export const getDiscipline = (slug: string) =>
  DISCIPLINES.find((d) => d.slug === slug);

/** Every known skill, for validating what came back from the client. */
export const KNOWN_SKILLS = new Set(DISCIPLINES.flatMap((d) => d.skills));

/* ---------------------------------------------------------------------------
 * Inferring disciplines from a job title.
 *
 * NO AI — that constraint is the whole point of this project, not a preference.
 * The published state of the art for title -> taxonomy mapping is LLM-based
 * (ESCO/O*NET normalisation), which is off the table. The deterministic method
 * those same taxonomies ship is an ALIAS TABLE: O*NET's "Reported Titles" lists
 * the variant titles people actually write for each occupation. This is that,
 * scoped to the disciplines above.
 *
 * Tuned for PRECISION over recall. These pre-tick checkboxes, and a wrong tick
 * a tired volunteer doesn't notice becomes wrong matching data later — worse
 * than no suggestion at all. When a title is ambiguous ("Software Engineer"),
 * suggest only the craft skills every loop tests and let them pick the rest.
 * ------------------------------------------------------------------------- */

/** Seniority and employment noise — never signals WHAT someone works on. */
const NOISE =
  /\b(senior|snr|sr|junior|jnr|jr|staff|principal|lead|head|chief|director|vp|intern|trainee|associate|contract|freelance|remote|i{1,3}|iv|[0-9]+)\b/g;

/**
 * Ordered: the FIRST matching entry wins for overlapping text, so
 * "react native" is caught before the bare "react" rule.
 */
const TITLE_RULES: { match: RegExp; disciplines: string[] }[] = [
  // Non-tech first: "product manager" and "project manager" must be claimed
  // before any engineering rule gets near them.
  {
    match:
      /\b(product manager|product owner|product lead|apm|product management)\b/,
    disciplines: ["product-management"],
  },
  {
    match:
      /\b(project manager|program manager|delivery manager|scrum master|pmo|tpm)\b/,
    disciplines: ["project-management"],
  },
  {
    match: /\b(ux research|user research|design research)\w*\b/,
    disciplines: ["ux-research"],
  },
  {
    match:
      /\b(designer|design lead|ux|ui designer|product design|visual design|interaction design)\b/,
    disciplines: ["product-design"],
  },
  {
    match:
      /\b(marketing|growth|seo|content strateg\w*|brand|demand gen\w*|performance marketer)\b/,
    disciplines: ["marketing"],
  },
  {
    match:
      /\b(sales|account executive|account manager|sdr|bdr|business development|revenue)\b/,
    disciplines: ["sales"],
  },
  {
    match: /\b(founder|co-founder|cofounder|entrepreneur|ceo)\b/,
    disciplines: ["founder"],
  },

  // Mobile before frontend — "react native developer" is a mobile role.
  {
    match: /\b(react native|flutter|ios|android|mobile|swift|kotlin)\b/,
    disciplines: ["mobile"],
  },

  {
    match:
      /\b(front[\s-]?end|frontend|ui engineer|react|angular|vue|svelte|next\.?js)\b/,
    disciplines: ["frontend"],
  },
  {
    match:
      /\b(back[\s-]?end|backend|api engineer|django|rails|laravel|spring|\.net)\b/,
    disciplines: ["backend"],
  },
  {
    match: /\b(full[\s-]?stack|fullstack|mern|mean)\b/,
    disciplines: ["fullstack", "frontend", "backend"],
  },

  {
    match:
      /\b(devops|sre|site reliability|platform engineer|infrastructure|cloud|kubernetes|sysadmin|systems administrator)\b/,
    disciplines: ["devops"],
  },
  {
    match:
      /\b(data scien\w*|data engineer|data analyst|machine learning|ml|analytics|business intelligence|bi)\b/,
    disciplines: ["data"],
  },
  {
    match:
      /\b(qa|quality assurance|sdet|test engineer|tester|automation engineer)\b/,
    disciplines: ["qa"],
  },
  {
    match: /\b(security|appsec|infosec|penetration|pentest|cyber)\b/,
    disciplines: ["security"],
  },
  {
    match: /\b(embedded|firmware|kernel|driver|systems engineer|c\+\+)\b/,
    disciplines: ["systems"],
  },
];

/** Titles that mean "an engineer" but not which kind. */
const GENERIC_ENGINEER =
  /\b(software|engineer|developer|programmer|swe|sde|coder|architect|cto|tech lead)\b/;

/**
 * Best-effort discipline suggestions for a job title.
 * Pure and dependency-free so it runs on the client and is trivial to test.
 * Returns [] when nothing is confident — an empty suggestion is a fine answer.
 */
export function inferDisciplines(jobTitle: string): string[] {
  if (typeof jobTitle !== "string") return [];

  const cleaned = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9+.\s-]/g, " ")
    .replace(NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  // Each match CONSUMES the text it matched, so an earlier rule wins the words
  // it claimed. Without this, "react native developer" hits the mobile rule and
  // then the bare "react" rule, and gets wrongly tagged frontend too.
  let rest = cleaned;
  const found: string[] = [];
  for (const rule of TITLE_RULES) {
    if (!rule.match.test(rest)) continue;
    rest = rest.replace(rule.match, " ");
    for (const d of rule.disciplines) if (!found.includes(d)) found.push(d);
  }

  // Every engineering loop tests DSA, system design and behavioural questions,
  // so craft is a safe addition for any engineering title — and is the ONLY
  // suggestion when the title says "engineer" without saying what kind.
  // Tested against the ORIGINAL title, not the leftovers: the "data engineer"
  // rule consumes the word "engineer", which would otherwise hide the fact
  // that this is an engineering role at all.
  if (GENERIC_ENGINEER.test(cleaned) && !found.includes("engineering-craft"))
    found.push("engineering-craft");

  return found.filter((d) => DISCIPLINE_SLUGS.has(d));
}
