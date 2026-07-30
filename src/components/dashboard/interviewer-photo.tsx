"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2, Upload } from "lucide-react";

import {
  removeInterviewerPhotoAction,
  uploadInterviewerPhotoAction,
} from "@/app/dashboard/actions";
import { photoUrl } from "@/lib/photo";
import { cn } from "@/lib/utils";

/**
 * The interviewer's photo.
 *
 * Deliberately NOT a field inside ProfileForm: that form batches a card's worth
 * of edits behind a Save, and a photo is a single decision that should land the
 * moment it's made. It also means no nested form and no file input riding along
 * on every unrelated profile save.
 */

/** Square, and the same edge every time, so no layout shifts between profiles. */
const OUTPUT_SIZE = 512;

/** Mirrors MAX_PHOTO_BYTES on the server — checked there too, since this
 *  component is not a security boundary. */
const MAX_BYTES = 2 * 1024 * 1024;

/** The file the member PICKS, before squaring — the product rule (5 MB), not
 *  a technical one. The re-encoded upload is far smaller anyway; this exists
 *  so "my 40 MB scan won't upload" is an instant message, not a slow failure. */
const MAX_PICK_BYTES = 5 * 1024 * 1024;

/**
 * Square, shrink and re-encode in the browser.
 *
 * Three things at once, all of them worth having:
 *   - a 6 MB phone photo becomes ~40 KB, so the upload isn't a progress bar;
 *   - every stored photo is the same 512px square, so the UI can't be handed a
 *     panorama to letterbox;
 *   - re-encoding through a canvas DROPS EXIF, and phone photos routinely carry
 *     GPS coordinates in it. Uploading the original would publish the
 *     interviewer's home address alongside their face.
 */
async function toSquare(file: File): Promise<File> {
  // "from-image" is the difference between a portrait iPhone shot appearing
  // upright and appearing on its side — the rotation lives in EXIF, which is
  // exactly what we're about to discard.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));

    // JPEG, not WebP — even though WebP is smaller and every browser here can
    // make one. The card download and the share image are rendered by a PNG
    // renderer that decodes JPEG and PNG and nothing else, so a WebP upload
    // takes both of them down. The server enforces the same rule; this just
    // means it never has to.
    const blob = (await encode("image/jpeg")) ?? (await encode("image/png"));
    if (!blob) throw new Error("encode failed");

    const ext = blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `photo.${ext}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

export function InterviewerPhoto({
  initialKey,
  name,
}: {
  initialKey?: string;
  name: string;
}) {
  const [key, setKey] = useState<string | undefined>(initialKey);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // An object URL is a document-lifetime allocation — without this every
  // re-pick leaks the previous image for as long as the tab is open.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const shown = preview ?? (key ? photoUrl(key) : null);

  function choose(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("That isn't an image file.");
      return;
    }
    if (file.size > MAX_PICK_BYTES) {
      setError("That photo is too large. Please pick one under 5 MB.");
      return;
    }

    start(async () => {
      let squared: File;
      try {
        squared = await toSquare(file);
      } catch {
        setError(
          "Couldn't read that image. A JPEG or PNG from your photo library works best.",
        );
        return;
      }

      if (squared.size > MAX_BYTES) {
        setError("Please keep the photo under 2 MB.");
        return;
      }

      const objectUrl = URL.createObjectURL(squared);
      setPreview(objectUrl);

      const fd = new FormData();
      fd.set("photo", squared);

      const res = await uploadInterviewerPhotoAction(fd);
      if (res.ok && "key" in res) {
        setKey(res.key);
        // Drop the local preview only once the stored one can be fetched, so
        // the frame never blinks empty between the two.
        setPreview(null);
      } else {
        setPreview(null);
        setError(res.ok ? "Couldn't save that photo." : res.error);
      }
    });
  }

  function remove() {
    setError(null);
    start(async () => {
      const res = await removeInterviewerPhotoAction();
      if (res.ok) {
        setKey(undefined);
        setPreview(null);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <section className="border-[1.5px] border-ink/15 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
        <h2 className="stamp-label text-[0.6875rem]">Professional photo</h2>
        {pending && (
          <span role="status" className="text-xs font-medium text-ink-soft">
            Working…
          </span>
        )}
      </header>

      <div className="px-5 py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className={cn(
              "size-28 shrink-0 overflow-hidden border-[1.5px]",
              shown ? "border-ink/25" : "border-dashed border-ink/30",
            )}
          >
            {shown ? (
              // Same reasoning as the header avatar: a plain <img> keeps
              // next/image host configuration out of this, and the bytes are
              // already a 512px square so there is nothing left to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown}
                alt={`${name}'s profile photo`}
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-center text-xs text-ink-soft">
                No photo yet
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-soft">
              Once a session is confirmed, this is how your candidate knows who
              they&apos;re about to meet. A clear, recent, professional photo
              does more for that than a name on a calendar invite.
            </p>

            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              <li>· Head and shoulders, face clearly visible</li>
              <li>· Good light, plain background</li>
              <li>· You on your own — no group shots or logos</li>
            </ul>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/*"
                className="sr-only"
                onChange={(e) => {
                  choose(e.target.files?.[0]);
                  // Reset, so picking the SAME file again still fires change.
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => inputRef.current?.click()}
                className="inline-flex h-11 items-center gap-2 bg-vermilion-strong px-5 text-sm font-medium text-chalk transition-opacity disabled:opacity-70"
              >
                <Upload className="size-4" />
                {key ? "Replace photo" : "Add a photo"}
              </button>

              {key && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={remove}
                  className="inline-flex h-11 items-center gap-2 border-[1.5px] border-ink/30 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-vermilion-deep hover:text-vermilion-deep disabled:opacity-70"
                >
                  <Trash2 className="size-4" />
                  Remove
                </button>
              )}
            </div>

            <p className="mt-3 text-xs text-ink-soft">
              JPEG or PNG, up to 5 MB. Cropped to a square and resized here in
              your browser, so location data in the original is never uploaded.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-3 text-sm font-medium text-vermilion-deep"
              >
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
