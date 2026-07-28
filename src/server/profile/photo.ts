import "server-only";

import { createHash } from "node:crypto";

import { getDb } from "@/server/db/mongo";
import { deleteObject, isStorageConfigured, putObject } from "@/server/storage/r2";

import type { ProfileDoc } from "./profile";

/**
 * The interviewer's photo.
 *
 * Candidates don't pick their interviewer — a session is matched automatically
 * or confirmed by an admin — so this is not a shop window. It earns its place
 * AFTER the match: the two-link bar in profile.ts is what proves the person on
 * the other end is real, and a face is the other half of that.
 *
 * Stored as an object KEY, never a URL. Buckets get renamed and public domains
 * get swapped; neither should mean rewriting rows.
 */

/** Where interviewer photos live in the bucket. */
export const PHOTO_PREFIX = "interviewer";

/**
 * 2 MB, and the browser has already squared and re-encoded to ~50 KB before we
 * ever see it. This cap is for the request that skips the browser entirely.
 */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Smallest square we will accept back from the client encoder. */
export const PHOTO_SIZE = 512;

/**
 * One hour — deliberately NOT `immutable`.
 *
 * Content-addressed keys mean a photo's bytes can never change under a URL, so
 * caching it for a year would be correct for every reason except the one that
 * matters: removal. "Take my face off this site" has to actually take effect,
 * and an `immutable` response tells browsers not to revalidate even on a hard
 * reload — so a candidate who saw the photo once would hold a working URL for a
 * year after it was deleted.
 *
 * An hour still means a page full of photos costs one fetch each, and the
 * bytes are ~40 KB.
 */
export const PHOTO_CACHE_CONTROL = "public, max-age=3600";

type ImageKind = { mime: string; ext: string };

/**
 * What the bytes ACTUALLY are.
 *
 * The `type` on an uploaded File is client-supplied and trivially forged, and
 * this value decides both the stored Content-Type and the extension — get it
 * from the form and you have an "image" that R2 will happily serve back as
 * text/html to the next member who opens the profile.
 */
export function sniffImageType(bytes: Uint8Array): ImageKind | null {
  const b = bytes;
  if (b.length < 12) return null;

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  )
    return { mime: "image/png", ext: "png" };

  // WebP: "RIFF" .... "WEBP"
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return { mime: "image/webp", ext: "webp" };

  return null;
}

/**
 * Content-addressed, so replacing a photo yields a NEW key.
 *
 * That is what lets the bytes be served `immutable` for a year: the URL changes
 * the moment the image does, so no cache anywhere has to be told to let go of
 * the old one. Re-uploading the identical file is a no-op that lands on the
 * same key.
 */
export function photoKey(userId: string, bytes: Uint8Array, ext: string): string {
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  return `${PHOTO_PREFIX}/${userId}/${digest}.${ext}`;
}

/**
 * Keys we are willing to serve.
 *
 * The proxy route reads a key straight off the URL, so this is the guard that
 * keeps it from being a read-anything-in-the-bucket endpoint. Anchored, fixed
 * shape, no traversal segments possible.
 */
const KEY_SHAPE = new RegExp(
  `^${PHOTO_PREFIX}/[A-Za-z0-9_-]{1,64}/[a-f0-9]{16}\\.(jpg|png|webp)$`,
);

export function isServablePhotoKey(key: string): boolean {
  return KEY_SHAPE.test(key);
}

export type PhotoResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

function profiles() {
  return getDb().collection<ProfileDoc>("profile");
}

/**
 * Validate, store, then point the profile at the new key.
 *
 * Order matters: the object is written BEFORE the document is updated, so a
 * failure between the two leaves an unreferenced object (invisible, costs a few
 * KB) rather than a profile pointing at bytes that were never stored (a broken
 * image on every candidate's screen).
 */
export async function saveInterviewerPhoto(
  userId: string,
  bytes: Uint8Array,
): Promise<PhotoResult> {
  if (!isStorageConfigured())
    return { ok: false, error: "Photo uploads aren't available right now." };

  if (bytes.length === 0) return { ok: false, error: "That file is empty." };
  if (bytes.length > MAX_PHOTO_BYTES)
    return { ok: false, error: "Please keep the photo under 2 MB." };

  const kind = sniffImageType(bytes);
  if (!kind)
    return {
      ok: false,
      error: "That doesn't look like a JPEG, PNG or WebP image.",
    };

  // The session id is the only thing interpolated into the key; keep it to the
  // alphabet KEY_SHAPE will accept so a stored key is always a servable one.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId))
    return { ok: false, error: "Couldn't save that photo." };

  const key = photoKey(userId, bytes, kind.ext);

  const put = await putObject(key, bytes, kind.mime, PHOTO_CACHE_CONTROL);
  if (!put.ok) return put;

  const previous = await profiles().findOne(
    { userId },
    { projection: { _id: 0, photo: 1 } },
  );

  await profiles().updateOne(
    { userId },
    { $set: { photo: { key, updatedAt: new Date() }, updatedAt: new Date() } },
    { upsert: true },
  );

  // Only after the profile is safely pointing elsewhere. Best-effort by design
  // — an orphan costs storage, a premature delete costs a live image.
  //
  // Re-validated rather than trusted: today `photo.key` is written only here,
  // but this is a delete against the whole bucket, and the alternative is that
  // every future writer to the profile collection has to know that. Checking
  // the shape keeps the guarantee inside this module.
  const old = previous?.photo?.key;
  if (old && old !== key && isServablePhotoKey(old)) await deleteObject(old);

  return { ok: true, key };
}

export async function removeInterviewerPhoto(userId: string): Promise<void> {
  const existing = await profiles().findOne(
    { userId },
    { projection: { _id: 0, photo: 1 } },
  );

  await profiles().updateOne(
    { userId },
    { $unset: { photo: "" }, $set: { updatedAt: new Date() } },
  );

  // Same reasoning as saveInterviewerPhoto: shape-checked before it is handed
  // to a bucket-wide delete.
  const old = existing?.photo?.key;
  if (old && isServablePhotoKey(old)) await deleteObject(old);
}
