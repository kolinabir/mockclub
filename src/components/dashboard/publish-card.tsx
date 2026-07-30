"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe, Pencil } from "lucide-react";

import {
  setHandleAction,
  setProfileVisibilityAction,
} from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

/**
 * The switch that puts an interviewer's page on the open web.
 *
 * Off by default, and asked for rather than assumed. Everything else on a
 * profile is shown to ONE matched candidate; this puts a face, a job title and
 * an employer on a URL anyone can open and Google can index. That is a
 * different decision, so it gets its own deliberate act — a member who never
 * touches this control has no public page, which is the right failure.
 */
/** Same control style as the rest of the dashboard forms. */
const FIELD =
  "rounded-none border-[1.5px] border-ink/35 bg-paper px-3 text-base text-ink " +
  "outline-none transition-all placeholder:text-ink-soft/70 " +
  "focus-visible:border-ink focus-visible:shadow-[3px_3px_0_0_var(--vermilion)]";

export function PublishCard({
  isPublic: initial,
  canPublish,
  handle: initialHandle,
  origin,
  className,
}: {
  isPublic: boolean;
  canPublish: boolean;
  /** Absent until the first publish, which is when one gets allocated. */
  handle?: string;
  /** Absolute site origin, so a copied link works when pasted anywhere. */
  origin: string;
  /** Spacing is the page's call — the card-page rail sets its own rhythm. */
  className?: string;
}) {
  const [isPublic, setIsPublic] = useState(initial);
  const [handle, setHandle] = useState(initialHandle);
  const [draft, setDraft] = useState(initialHandle ?? "");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const url = handle ? `${origin}/i/${handle}` : "";

  function toggle() {
    const next = !isPublic;
    setError(null);
    // Optimistic: the switch is the whole interaction, and a half-second of
    // "nothing happened" is what makes people click it twice.
    setIsPublic(next);

    start(async () => {
      const res = await setProfileVisibilityAction(next);
      if (!res.ok) {
        setIsPublic(!next);
        setError(res.error);
        return;
      }
      // Publishing for the first time is what allocates the link.
      if (res.handle) {
        setHandle(res.handle);
        setDraft(res.handle);
      }
    });
  }

  function openRename() {
    setDraft(handle ?? "");
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function saveHandle() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("handle", draft);

      const res = await setHandleAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHandle(res.handle);
      setDraft(res.handle);
      setEditing(false);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — select the link and copy it by hand.");
    }
  }

  return (
    <section className={cn("press bg-card p-6 sm:p-7", className ?? "mt-10")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="stamp-label flex items-center gap-2 text-ink-soft">
            <Globe className="size-3.5" strokeWidth={2.5} aria-hidden />
            Public page
          </p>
          <h2 className="display mt-2.5 text-[clamp(1.25rem,3.5vw,1.625rem)] font-semibold">
            {isPublic ? "Your page is live." : "Share your card as a page."}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {isPublic
              ? "Anyone with the link can see your card, the areas you cover and the profiles you've listed. Nothing else — not your email, not your hours."
              : "A page of your own: the card, what you can assess, and where to find you. Off until you turn it on."}
          </p>
        </div>

        {/* A real checkbox, not a div with a click handler — it is a switch, and
            everything that makes a switch work for a keyboard or a screen
            reader comes free with the element. */}
        <label className="flex shrink-0 cursor-pointer items-center gap-3">
          <span className="text-sm font-medium">{isPublic ? "On" : "Off"}</span>
          <input
            type="checkbox"
            role="switch"
            checked={isPublic}
            disabled={!canPublish || pending}
            onChange={toggle}
            className="peer sr-only"
          />
          {/* The knob is a DESCENDANT of the track, and `peer-checked:` compiles
              to a sibling combinator — so the state has to be pushed down with
              an explicit child selector. RTL flips the travel, not the box. */}
          <span
            aria-hidden
            className="relative h-7 w-12 shrink-0 border-[1.5px] border-ink/35 bg-paper-deep transition-colors peer-checked:border-ink peer-checked:bg-vermilion-strong peer-disabled:opacity-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vermilion peer-checked:[&>span]:translate-x-[21px] peer-checked:[&>span]:bg-chalk rtl:peer-checked:[&>span]:-translate-x-[21px]"
          >
            <span className="absolute inset-y-0.5 start-0.5 block size-5 bg-ink transition-transform" />
          </span>
        </label>
      </div>

      {!canPublish && (
        <p className="mt-4 text-sm text-ink-soft">
          Finish your card first — the page is made of it.
        </p>
      )}

      {isPublic && handle && !editing && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            {/* The handle is the part they own, so it's the part that's set in
                ink — the origin around it is chrome. */}
            <code className="min-w-0 flex-1 truncate border-[1.5px] border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink-soft">
              {origin.replace(/^https?:\/\//, "")}/i/
              <span className="font-semibold text-ink">{handle}</span>
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/30 px-4 text-sm font-medium transition-colors hover:border-ink"
            >
              {copied ? (
                <Check className="size-4 text-olive" strokeWidth={2.5} />
              ) : (
                <Copy className="size-4" strokeWidth={2.5} />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/30 px-4 text-sm font-medium transition-colors hover:border-ink"
            >
              <ExternalLink className="size-4" strokeWidth={2.5} />
              Visit
            </a>
          </div>

          <button
            type="button"
            onClick={openRename}
            className="stamp-label mt-3 inline-flex items-center gap-1.5 text-[0.625rem] text-ink-soft transition-colors hover:text-vermilion-deep"
          >
            <Pencil className="size-3" strokeWidth={2.5} />
            Change the link
          </button>
        </div>
      )}

      {isPublic && handle && editing && (
        <div className="mt-5 border-t border-ink/15 pt-5">
          <label htmlFor="handle" className="text-sm font-medium">
            Your link
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-soft">
              {origin.replace(/^https?:\/\//, "")}/i/
            </span>
            <input
              id="handle"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveHandle();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setEditing(false);
                  setError(null);
                }
              }}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={cn(FIELD, "h-11 min-w-0 flex-1")}
            />
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            Letters, numbers and hyphens. Changing it breaks the old link —
            anywhere you&apos;ve already pasted it will stop working.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveHandle}
              disabled={pending}
              className="h-11 rounded-none bg-vermilion-strong px-6 text-sm font-medium text-chalk transition-opacity disabled:opacity-70"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={pending}
              className="h-11 border-[1.5px] border-ink/30 px-5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-vermilion-deep">
          {error}
        </p>
      )}
    </section>
  );
}
