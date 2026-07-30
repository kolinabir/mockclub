/**
 * Object key -> something an `<img>` can load.
 *
 * Lives in lib/ rather than server/ because both sides need it: the page that
 * renders a profile and the client component that shows a freshly uploaded
 * photo have to agree on one answer.
 *
 * Today that answer is the proxy route, which streams from a PRIVATE bucket —
 * so nothing works by accident and no bucket has to be opened to the world. If
 * public access is ever switched on for the bucket, this one function becomes
 * `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}` and nothing else moves,
 * which is the whole reason keys (not URLs) are what gets stored.
 */
export function photoUrl(key: string): string {
  // The key alphabet is fixed by isServablePhotoKey (word chars, hex, a known
  // extension), so no segment here can need escaping — but encode anyway, so a
  // future key shape can't quietly turn into a malformed URL.
  return `/api/photo/${key.split("/").map(encodeURIComponent).join("/")}`;
}
