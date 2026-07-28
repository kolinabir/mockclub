"use client";

import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { saveDisplayNameAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

/**
 * The name on the card.
 *
 * Deliberately NOT a field in ProfileForm: that form writes the profile
 * document, and this writes the Better Auth user. Same reasoning as
 * InterviewerPhoto — one decision, one action, saved the moment it's made.
 *
 * Google supplied the initial value. For most people it's right; for the people
 * it isn't (a legal name, the wrong script, a name they no longer use) this is
 * the only place it can be changed, and it is the first line a candidate reads.
 */

/** Mirrors MAX_NAME_LENGTH on the server, which is where it's enforced —
 *  this module can't import it, because users.ts is `server-only`. */
const MAX_NAME_LENGTH = 60;

/** Same control style as ProfileForm — quiet at rest, letterpress on focus. */
const FIELD =
  "rounded-none border-[1.5px] border-ink/35 bg-paper px-3 text-base text-ink " +
  "outline-none transition-all placeholder:text-ink-soft/70 " +
  "focus-visible:border-ink focus-visible:shadow-[3px_3px_0_0_var(--vermilion)]";

export function DisplayName({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setDraft(name);
    setError(null);
    setSaved(false);
    setEditing(true);
    // The frame is already on screen, so focus is the only thing that says
    // "this is now editable" to someone not using a mouse.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function cancel() {
    setDraft(name);
    setError(null);
    setEditing(false);
  }

  function save() {
    setError(null);
    start(async () => {
      const fd = new FormData();
      fd.set("name", draft);

      const res = await saveDisplayNameAction(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // The server normalises (padding collapsed, invisibles stripped), so take
      // ITS answer back rather than the draft — otherwise the field shows one
      // name and the card prints another.
      setName(res.name);
      setDraft(res.name);
      setEditing(false);
      setSaved(true);
    });
  }

  return (
    <section className="border-[1.5px] border-ink/15 bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
        <h2 className="stamp-label text-[0.6875rem]">Name</h2>
        {editing ? (
          <span className="stamp-label text-[0.625rem] text-vermilion-deep">
            Editing
          </span>
        ) : (
          <span className="flex items-center gap-3">
            {saved && (
              <span role="status" className="text-xs font-medium text-olive">
                Saved.
              </span>
            )}
            <button
              type="button"
              onClick={open}
              className="stamp-label flex items-center gap-1.5 text-[0.625rem] text-ink-soft transition-colors hover:text-vermilion-deep"
            >
              <Pencil className="size-3" strokeWidth={2.5} />
              Edit
            </button>
          </span>
        )}
      </header>

      <div className="px-5 py-6">
        {editing ? (
          <div>
            <label htmlFor="displayName" className="text-sm font-medium">
              How your name is printed
            </label>
            <input
              id="displayName"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // A single field with no <form> around it: nothing would happen
                // on Enter otherwise, and that reads as a broken save.
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancel();
                }
              }}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="name"
              className={cn(FIELD, "mt-1.5 h-12 w-full")}
            />
            <p className="mt-2 text-sm text-ink-soft">
              This is what a candidate sees on your card and on the invite. Any
              script is fine.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-4">
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="h-11 rounded-none bg-vermilion-strong px-6 text-sm font-medium text-chalk transition-opacity disabled:opacity-70"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="h-11 border-[1.5px] border-ink/30 px-5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-70"
              >
                Cancel
              </button>
              {error && (
                <p role="alert" className="text-sm font-medium text-vermilion-deep">
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="display text-[clamp(1.375rem,4vw,1.75rem)] font-semibold">
            {name}
          </p>
        )}
      </div>
    </section>
  );
}
