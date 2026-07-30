import { headers } from "next/headers";

import { auth, hasRole, parseRoles, type Role } from "@/server/auth/auth";

/**
 * App-layer session helpers. These live in lib/ (not server/) because they use
 * next/headers — server/ must stay framework-free.
 */

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Admin access is an ENV allowlist, not a database role.
 *
 * ADMIN_EMAILS is a comma-separated list; an email on it is an admin, anyone
 * else is not, and an unset variable means NOBODY is — the safe failure. The
 * email is trustworthy because it comes from Google OAuth, not from a form.
 * Server-only by construction: this module never reaches the client bundle.
 *
 * The `admin` role string in Mongo is deliberately NOT consulted for panel
 * access any more — one source of truth, editable without touching the DB.
 * The role field stays for what actually needs it later (moderators, bans).
 */
function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roles: string[];
  isAdmin: boolean;
  isInterviewer: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const role = session.user.role as string | undefined;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    roles: parseRoles(role),
    isAdmin: isAdminEmail(session.user.email),
    isInterviewer: hasRole(role, "interviewer" as Role),
  };
}
