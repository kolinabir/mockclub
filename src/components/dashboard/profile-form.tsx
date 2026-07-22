"use client";

import { useState, useTransition } from "react";

import { saveProfileAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type Track = { slug: string; name: string };

const LEVELS = [
  { value: "entry", label: "Entry / Junior" },
  { value: "mid", label: "Mid-level" },
  { value: "senior", label: "Senior" },
  { value: "switcher", label: "Career switcher" },
];

export function ProfileForm({
  tracks,
  languages,
  initial,
}: {
  tracks: Track[];
  languages: readonly string[];
  initial: {
    trackSlug?: string;
    level?: string;
    languages?: string[];
    timeZone?: string;
  } | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [track, setTrack] = useState(initial?.trackSlug ?? tracks[0].slug);
  const [level, setLevel] = useState(initial?.level ?? "entry");
  const [langs, setLangs] = useState<string[]>(initial?.languages ?? ["English"]);
  // Detected from the browser, always overridable, stored as an IANA id.
  const [tz, setTz] = useState(
    initial?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  function toggleLang(l: string) {
    setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("trackSlug", track);
    fd.set("level", level);
    fd.set("timeZone", tz);
    langs.forEach((l) => fd.append("languages", l));

    start(async () => {
      const res = await saveProfileAction(fd);
      setMsg(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="track" className="stamp-label text-ink-soft">Track</label>
        <select
          id="track"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="mt-2 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
        >
          {tracks.map((t) => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="stamp-label text-ink-soft">Level</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLevel(l.value)}
              aria-pressed={level === l.value}
              className={cn(
                "min-h-11 border-[1.5px] px-3 py-2.5 text-sm font-medium transition-all",
                level === l.value
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 text-ink-soft hover:border-ink"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="stamp-label text-ink-soft">Languages you can interview in</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {languages.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLang(l)}
              aria-pressed={langs.includes(l)}
              className={cn(
                "min-h-11 border-[1.5px] px-3 py-2 text-sm font-medium transition-all",
                langs.includes(l)
                  ? "border-vermilion-deep text-vermilion-deep"
                  : "border-ink/25 text-ink-soft hover:border-ink"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="tz" className="stamp-label text-ink-soft">Timezone</label>
        <input
          id="tz"
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="mt-2 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
        />
        <p className="mt-2 text-sm text-ink-soft">
          Detected automatically. Everything you see is shown in this zone.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="press press-hover h-12 rounded-none bg-vermilion-strong px-7 text-base font-medium text-chalk disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        {msg && (
          <p role="status" className={cn("text-sm font-medium", msg.ok ? "text-olive" : "text-vermilion-deep")}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
