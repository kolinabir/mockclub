"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/session";
import { setDisplayName, updateUser } from "@/server/users/users";
import { saveSettings } from "@/server/availability/availability";
import {
  saveAvailability as saveSchedule,
  syncTimeZone,
} from "@/server/scheduling/scheduling";
import { getProfile, saveProfile } from "@/server/profile/profile";
import { changeHandle, setProfileVisibility } from "@/server/profile/public";
import {
  MAX_PHOTO_BYTES,
  removeInterviewerPhoto,
  saveInterviewerPhoto,
} from "@/server/profile/photo";
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

/**
 * Per-user write throttle, keyed on the session id so it can't be spoofed.
 *
 * `max` is overridable because the actions are not equally cheap — a profile
 * save is one small document write, an upload is megabytes crossing the wire
 * into object storage.
 */
async function throttle(
  userId: string,
  name: string,
  max = 20,
): Promise<Fail | null> {
  const { limited } = await rateLimit(`action:${name}:${userId}`, {
    max,
    windowSeconds: 60,
  });
  return limited
    ? { ok: false, error: "Too many changes. Try again shortly." }
    : null;
}

/** Session + throttle, the two checks every action needs. */
async function guard(name: string, max?: number) {
  const user = await getCurrentUser();
  if (!user)
    return {
      user: null,
      fail: { ok: false, error: "Please sign in again." } as Fail,
    };

  const tooMany = await throttle(user.id, name, max);
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
    // The link bar differs by side of the room; never trust the form for it.
    memberRole: user!.isInterviewer ? "interviewer" : "candidate",
  });

  if (result.ok) {
    // The profile owns the zone; the schedule mirrors it. Moving country has to
    // move your materialised slots with you, or every one of them stays at the
    // old offset while the screen shows the new zone.
    //
    // Swallowed on purpose: the profile write has ALREADY committed, so
    // throwing here would report "couldn't save" for a change that did save.
    // syncTimeZone writes the schedule's zone before it regenerates, and the
    // nightly sweep regenerates from that, so a failure here self-heals.
    await syncTimeZone(user!.id).catch(() => {});
    revalidatePath("/dashboard");
  }
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

  // Scheduling owns the schedule, its rules and the materialised slots. The
  // zone is deliberately not read from the form — it comes from the profile.
  const result = await saveSchedule(user!.id, { rules });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

export async function saveSettingsAction(formData: FormData) {
  const { user, fail } = await guard("settings");
  if (fail) return fail;
  if (!user!.isInterviewer)
    return { ok: false as const, error: "Only interviewers can change this." };

  const result = await saveSettings(user!.id, {
    paused: formData.get("paused") === "on",
  });
  if (result.ok) revalidatePath("/dashboard");
  return result;
}

/**
 * The name on the card.
 *
 * Its own action rather than a field on saveProfileAction, because it writes to
 * the Better Auth `user` document, not the profile — and mixing a write to
 * another collection into a save that can partially fail is how the two get out
 * of step.
 */
export async function saveDisplayNameAction(formData: FormData) {
  const { user, fail } = await guard("name", 10);
  if (fail) return fail;

  const result = await setDisplayName(user!.id, formData.get("name"));
  if (!result.ok) return { ok: false as const, error: result.error };

  // The name is read from the session on every dashboard route, and printed on
  // the card — all three have to reprint, not just the page it was typed on.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/card");
  return { ok: true as const, name: result.value };
}

/**
 * Publish or unpublish the public interviewer page.
 *
 * The rule lives in server/profile/public.ts — including the deliberate
 * asymmetry that turning it OFF is never gated, so a page can always be taken
 * down even if it would no longer qualify to go up.
 */
export async function setProfileVisibilityAction(isPublic: boolean) {
  const { user, fail } = await guard("visibility", 10);
  if (fail) return fail;

  const result = await setProfileVisibility(user!, isPublic);
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidatePath("/dashboard/card");
  revalidatePath("/dashboard/profile");
  if (result.handle) revalidatePath(`/interviewers/${result.handle}`);
  return { ok: true as const, isPublic: result.isPublic, handle: result.handle };
}

/**
 * Rename the public page.
 *
 * Both the old and the new URL are revalidated: the old one has to start
 * 404ing immediately, or a cached copy keeps serving a page at an address the
 * member has already given up.
 */
export async function setHandleAction(formData: FormData) {
  const { user, fail } = await guard("handle", 10);
  if (fail) return fail;

  const previous = (await getProfile(user!.id))?.handle;
  const result = await changeHandle(user!.id, formData.get("handle"));
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidatePath("/dashboard/card");
  if (previous) revalidatePath(`/interviewers/${previous}`);
  revalidatePath(`/interviewers/${result.handle}`);
  return { ok: true as const, handle: result.handle };
}

/**
 * Store an interviewer's photo.
 *
 * Throttled harder than the rest: this one carries a file. The browser squares
 * and re-encodes before sending, so the usual payload is tens of KB — but this
 * action is a public endpoint like any other, and nothing stops a caller from
 * skipping the browser entirely, so the size check is repeated server-side.
 */
export async function uploadInterviewerPhotoAction(formData: FormData) {
  const { user, fail } = await guard("photo", 6);
  if (fail) return fail;
  if (!user!.isInterviewer)
    return { ok: false as const, error: "Only interviewers have a photo." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false as const, error: "Choose a photo first." };

  // Checked before reading the body into memory, so an oversized upload costs
  // us the header and nothing more.
  if (file.size > MAX_PHOTO_BYTES)
    return { ok: false as const, error: "Please keep the photo under 2 MB." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await saveInterviewerPhoto(user!.id, bytes);

  if (result.ok) {
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
  }
  return result;
}

export async function removeInterviewerPhotoAction() {
  const { user, fail } = await guard("photo", 6);
  if (fail) return fail;
  if (!user!.isInterviewer)
    return { ok: false as const, error: "Only interviewers have a photo." };

  try {
    await removeInterviewerPhoto(user!.id);
  } catch {
    return { ok: false as const, error: "Couldn't remove that. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { ok: true as const };
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
