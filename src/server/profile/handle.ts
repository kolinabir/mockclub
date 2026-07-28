import "server-only";

/**
 * The handle in /i/<handle>.
 *
 * A public page is something people paste into a message, so it cannot be a
 * database id — an ObjectId tells the reader nothing, is impossible to say out
 * loud, and quietly publishes an internal identifier. One is generated from the
 * member's name the moment they publish, and they can change it afterwards.
 *
 * The pure rules live here so they can be tested without a database; the write
 * that actually claims one lives in profile.ts, next to the collection.
 */

export const MIN_HANDLE = 3;
export const MAX_HANDLE = 30;

/**
 * Names that must never become a handle.
 *
 * Two kinds. The first are words we may want as SIBLING routes under
 * /i/ later — once someone owns /i/search, shipping a search page means taking
 * their URL away. The second is the ObjectId shape: the route still resolves a
 * raw id so old links survive, so a handle of that shape would shadow a real
 * member's page.
 */
const RESERVED = new Set([
  "new",
  "me",
  "all",
  "index",
  "search",
  "browse",
  "admin",
  "api",
  "settings",
  "edit",
  "delete",
  "sitemap",
  "robots",
  "opengraph-image",
  "twitter-image",
  "null",
  "undefined",
  "interviewer",
  "interviewers",
  "mockclub",
]);

const OBJECT_ID = /^[0-9a-f]{24}$/;

export type HandleResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate a handle a member typed. Strict rather than forgiving: this is a
 * URL they will paste places, so silently rewriting what they asked for is
 * worse than telling them it isn't allowed.
 */
export function normalizeHandle(v: unknown): HandleResult {
  if (typeof v !== "string" || !v.trim())
    return { ok: false, error: "Choose a link for your page." };

  const handle = v.trim().toLowerCase();

  if (handle.length < MIN_HANDLE)
    return {
      ok: false,
      error: `Use at least ${MIN_HANDLE} characters.`,
    };
  if (handle.length > MAX_HANDLE)
    return { ok: false, error: `Keep it under ${MAX_HANDLE} characters.` };
  if (!/^[a-z0-9-]+$/.test(handle))
    return {
      ok: false,
      error: "Letters, numbers and hyphens only.",
    };
  if (!/^[a-z0-9]/.test(handle) || !/[a-z0-9]$/.test(handle))
    return { ok: false, error: "Start and end with a letter or number." };
  if (handle.includes("--"))
    return { ok: false, error: "One hyphen at a time." };
  if (RESERVED.has(handle) || OBJECT_ID.test(handle))
    return { ok: false, error: "That one is reserved. Try another." };

  return { ok: true, value: handle };
}

/**
 * The handle we hand someone who never asked for one.
 *
 * Their name, stripped to what a URL can carry. Non-Latin names strip to
 * nothing — a Bengali or Arabic name is not less of a name, so the fallback is
 * the card number they already have rather than a mangled transliteration.
 *
 * Returns CANDIDATES in preference order, because the first choice is often
 * taken and the caller needs somewhere to go next.
 */
export function handleCandidates(name: string, cardNo: string): string[] {
  const base = name
    .toLowerCase()
    // NFKD splits "é" into "e" + a combining mark, so the filter below keeps
    // the letter instead of dropping the whole character: José -> jose.
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, MAX_HANDLE);

  const fallback = `interviewer-${cardNo}`;
  const out: string[] = [];

  if (base.length >= MIN_HANDLE) {
    out.push(base);
    // Suffixes before the card number: "abirkolin2" reads better than
    // "abirkolin-93715" and is still obviously theirs.
    for (let n = 2; n <= 9; n++) {
      out.push(`${base.slice(0, MAX_HANDLE - 1)}${n}`);
    }
    out.push(`${base.slice(0, MAX_HANDLE - cardNo.length - 1)}-${cardNo}`);
  }

  out.push(fallback);

  // The generator must never produce something the validator would reject —
  // a name of "Search" or a stripped name that lands on a reserved word.
  return out.filter((h) => normalizeHandle(h).ok);
}
