"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/session";
import { updateUser } from "@/server/users/users";
import { saveSettings } from "@/server/availability/availability";
import { saveAvailability as saveSchedule } from "@/server/scheduling/scheduling";
import { saveProfile } from "@/server/profile/profile";
import { rateLimit } from "@/server/rate-limit";

/**
 * Every action re-checks the session itself. A server action is a public
 * endpoint — it is NOT protected by whatever guarded the page that rendered it.
 *
 * They are also throttled per user: an authenticated caller could otherwise
 * hammer these writes unbounded, since neither the page guard nor Better Auth's
 * limiter (which only covers /api/auth/*) applies here.
 */

type Fail = { ok: false; error: string };

/** Per-user write throttle, keyed on the session id so it can't be spoofed. */
async function throttle(userId: string, name: string): Promise<Fail | null> {
  const { limited } = await rateLimit(`action:${name}:${userId}`, {
    max: 20,
    windowSeconds: 60,
  });
  return limited
    ? { ok: false, error: "Too many changes. Try again shortly." }
    : null;
}

/** Session + throttle, the two checks every action needs. */
async function guard(name: string) {
  const user = await getCurrentUser();
  if (!user)
    return {
      user: null,
      fail: { ok: false, error: "Please sign in again." } as Fail,
    };

  const tooMany = await throttle(user.id, name);
  if (tooMany) return { user: null, fail: tooMany };

  return { user, fail: null };
}

export async function saveProfileAction(formData: FormData) {
  const { user, fail } = await guard("profile");
  if (fail) return fail;

  // Malformed JSON must not throw and 500 the action.
  let links: unknown = [];
  let disciplines: unknown = [];
  let skills: unknown = [];
  try {
    links = JSON.parse(String(formData.get("links") ?? "[]"));
    disciplines = JSON.parse(String(formData.get("disciplines") ?? "[]"));
    skills = JSON.parse(String(formData.get("skills") ?? "[]"));
  } catch {
    return { ok: false as const, error: "Couldn't read that form." };
  }

  const result = await saveProfile(user!.id, {
    trackSlug: formData.get("trackSlug"),
    customTrack: formData.get("customTrack"),
    level: formData.get("level"),
    languages: formData.getAll("languages"),
    links,
    timeZone: formData.get("timeZone"),
    yearsOfExperience: formData.get("yearsOfExperience"),
    company: formData.get("company"),
    role: formData.get("role"),
    current: formData.get("current") === "on",
    disciplines,
    skills,
  });

  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function saveAvailabilityAction(formData: FormData) {
  const { user, fail } = await guard("availability");
  if (fail) return fail;
  if (!user!.isInterviewer)
    return {
      ok: false as const,
      error: "Only interviewers can set availability.",
    };

  let rules: { days: unknown; startTime: unknown; endTime: unknown }[] = [];
  try {
    const raw = formData.get("rules");
    rules = JSON.parse(typeof raw === "string" ? raw : "[]");
    if (!Array.isArray(rules)) throw new Error("not an array");
  } catch {
    return { ok: false as const, error: "Couldn't read those hours." };
  }

  // Scheduling owns the schedule, its rules and the materialised slots.
  const result = await saveSchedule(user!.id, {
    timeZone: formData.get("timeZone"),
    rules,
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function saveSettingsAction(formData: FormData) {
  const { user, fail } = await guard("settings");
  if (fail) return fail;
  if (!user!.isInterviewer)
    return { ok: false as const, error: "Only interviewers can change this." };

  const result = await saveSettings(user!.id, {
    maxSessionsPerMonth: formData.get("maxSessionsPerMonth"),
    paused: formData.get("paused") === "on",
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

/**
 * Opt in to volunteering — the candidate→interviewer flywheel.
 * Only ever APPENDS "interviewer" to the roles already on the session, so this
 * can't be used to grant yourself admin or moderator.
 */
export async function becomeInterviewerAction() {
  const { user, fail } = await guard("role");
  if (fail) return fail;
  if (user!.isInterviewer) return { ok: true as const };

  const roles = [...new Set([...user!.roles, "interviewer"])];
  // Roles are a comma-separated string — Better Auth's native multi-role format.
  try {
    await updateUser(user!.id, { role: roles.join(",") });
  } catch {
    return {
      ok: false as const,
      error: "Couldn't save that. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  return { ok: true as const };
}
