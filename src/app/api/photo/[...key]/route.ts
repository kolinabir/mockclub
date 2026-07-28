import { NextResponse } from "next/server";

import { isServablePhotoKey, PHOTO_CACHE_CONTROL } from "@/server/profile/photo";
import { getObject } from "@/server/storage/r2";

/**
 * Serves interviewer photos out of R2.
 *
 * The bucket stays PRIVATE and the credentials never leave the server, which
 * is the point of proxying rather than handing out a public r2.dev domain: the
 * only objects reachable from the internet are the ones this route agrees to
 * serve, and that set is decided by `isServablePhotoKey` alone.
 *
 * The bytes themselves are not secret — the photo is shown to whoever ends up
 * matched with this interviewer, so there is no session check here. What
 * matters is that the key shape is anchored, so this cannot be walked into a
 * read-anything-in-the-bucket endpoint.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/photo/[...key]">,
) {
  const { key } = await ctx.params;
  const objectKey = key.join("/");

  // 404 rather than 400: an unservable key and a missing object should be
  // indistinguishable from outside, so this can't be used to probe the bucket.
  if (!isServablePhotoKey(objectKey))
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const object = await getObject(objectKey);
  if (!object)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      ...(object.contentLength
        ? { "Content-Length": String(object.contentLength) }
        : {}),
      ...(object.etag ? { ETag: object.etag } : {}),
      // Bounded, NOT immutable — see PHOTO_CACHE_CONTROL. Content addressing
      // would make a year safe for staleness; it does nothing for deletion,
      // and a removed photo has to stop resolving.
      "Cache-Control": PHOTO_CACHE_CONTROL,
      // The bytes were sniffed for a real image signature before they were
      // stored, but belt and braces — this response is same-origin.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
