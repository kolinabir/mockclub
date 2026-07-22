import "server-only";

import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";

import { getDb, getMongoClient } from "@/server/db/mongo";

/**
 * Better Auth — Google sign-in only, for now.
 *
 * Roles: the admin plugin stores them in a single `role` field as a
 * COMMA-SEPARATED string, and `setRole` accepts an array — so one person can be
 * "candidate,interviewer" natively. That matters: our best candidates become our
 * next interviewers, and that flywheel is how a volunteer platform survives.
 * No separate roles array; this is the built-in mechanism.
 */

export const ROLES = {
  candidate: "candidate",
  interviewer: "interviewer",
  moderator: "moderator",
  admin: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const auth = betterAuth({
  // Passing `client` enables transactions. Atlas is a replica set, so they work.
  database: mongodbAdapter(getDb(), { client: getMongoClient() }),

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Sign-in only. The Calendar scope is SENSITIVE — requesting it here would
      // drag the whole app into Google's verification review and gate launch.
      // It gets its own explicit "connect your calendar" consent later.
      scope: ["openid", "email", "profile"],
    },
  },

  // Better Auth defaults to IN-MEMORY rate limiting, which its own docs call
  // unsuitable for serverless (each instance keeps its own counters). Database
  // storage makes the limit shared and real. MongoDB is schemaless, so no
  // migration is needed — the adapter creates the collection.
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      // Sign-in is the endpoint worth abusing; keep it much tighter.
      "/sign-in/social": { window: 60, max: 10 },
      "/callback/:id": { window: 60, max: 20 },
    },
  },

  plugins: [
    admin({
      defaultRole: ROLES.candidate,
      adminRoles: [ROLES.admin],
    }),
    // Must stay LAST — it flushes auth cookies set during server actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Roles are a comma-separated string (Better Auth's native multi-role format). */
export function parseRoles(role?: string | null): string[] {
  return (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

export function hasRole(role: string | null | undefined, wanted: Role): boolean {
  return parseRoles(role).includes(wanted);
}
