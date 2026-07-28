"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";

import { setProfileVisibilityAction } from "@/app/dashboard/actions";

/**
 * The switch that puts an interviewer's page on the open web.
 *
 * Off by default, and asked for rather than assumed. Everything else on a
 * profile is shown to ONE matched candidate; this puts a face, a job title and
 * an employer on a URL anyone can open and Google can index. That is a
 * different decision, so it gets its own deliberate act — a member who never
 * touches this control has no public page, which is the right failure.
 */
export function PublishCard({
  isPublic: initial,
  canPublish,
  url,
}: {
  isPublic: boolean;
  canPublish: boolean;
  /** Absolute, so the copied link works when pasted anywhere. */
  url: string;
}) {
  const [isPublic, setIsPublic] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

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
      }
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
    <section className="press mt-10 bg-card p-6 sm:p-7">
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

      {isPublic && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-5">
          <code className="min-w-0 flex-1 truncate border-[1.5px] border-ink/15 bg-paper px-3 py-2.5 text-sm text-ink-soft">
            {url.replace(/^https?:\/\//, "")}
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
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-vermilion-deep">
          {error}
        </p>
      )}
    </section>
  );
}
