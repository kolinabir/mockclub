import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth/auth";

// Better Auth mounts its whole surface here — including the Google callback at
// /api/auth/callback/google, which must match the redirect URI in Google Cloud.
export const { GET, POST } = toNextJsHandler(auth.handler);
