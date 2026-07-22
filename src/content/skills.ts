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

export type Discipline = {
  /** URL-safe id. Never change one after it ships — it's stored on profiles. */
  slug: string;
  name: string;
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
];

/** Cap on custom skills, so the field can't be used as free storage. */
export const MAX_SKILLS = 20;
export const MAX_CUSTOM_SKILL_LENGTH = 40;

export const DISCIPLINE_SLUGS = new Set(DISCIPLINES.map((d) => d.slug));

export const getDiscipline = (slug: string) =>
  DISCIPLINES.find((d) => d.slug === slug);

/** Every known skill, for validating what came back from the client. */
export const KNOWN_SKILLS = new Set(DISCIPLINES.flatMap((d) => d.skills));
