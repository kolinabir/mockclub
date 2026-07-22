import { headers } from "next/headers";

import { auth, hasRole, parseRoles, type Role } from "@/server/auth/auth";

/**
 * App-layer session helpers. These live in lib/ (not server/) because they use
 * next/headers — server/ must stay framework-free.
 */

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
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
    isAdmin: hasRole(role, "admin" as Role),
    isInterviewer: hasRole(role, "interviewer" as Role),
  };
}
