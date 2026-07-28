import "server-only";

/**
 * Font bytes for the downloadable card.
 *
 * The card is rendered to a PNG on the server (see the download route), and the
 * renderer needs real font FILES — it has no browser, so `next/font` and the
 * stylesheet that normally serves these are no help to it. Without them the
 * download comes back in a generic sans and stops being the same card.
 *
 * Two things are load-bearing here:
 *
 *   - the legacy user agent. Google serves woff2 to anything modern, and the
 *     renderer cannot parse woff2. Asking as a browser from 2011 gets a TTF.
 *   - the module-level cache. These bytes never change, so the first download
 *     after a cold start pays for them and no later one does.
 *
 * A failure is never fatal: the caller drops the font and the PNG renders in
 * the built-in fallback. A download that looks slightly wrong beats one that
 * 500s because a CDN was briefly unreachable.
 */

const LEGACY_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 " +
  "(KHTML, like Gecko) Version/5.1 Safari/534.30";

const cache = new Map<string, Promise<ArrayBuffer | null>>();

async function fetchFont(spec: string): Promise<ArrayBuffer | null> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${spec}`, {
    headers: { "User-Agent": LEGACY_UA },
  });
  if (!css.ok) return null;

  const url = (await css.text()).match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
  if (!url) return null;

  const file = await fetch(url);
  return file.ok ? file.arrayBuffer() : null;
}

/**
 * `spec` is the css2 `family=` value, e.g. `Archivo:wght@600`.
 * Resolves to null when the font can't be fetched.
 */
export function loadGoogleFont(spec: string): Promise<ArrayBuffer | null> {
  const hit = cache.get(spec);
  if (hit) return hit;

  // Failures are evicted rather than cached, so one bad minute doesn't cost
  // every download for the life of the process.
  const pending = fetchFont(spec)
    .catch(() => null)
    .then((buf) => {
      if (!buf) cache.delete(spec);
      return buf;
    });

  cache.set(spec, pending);
  return pending;
}
