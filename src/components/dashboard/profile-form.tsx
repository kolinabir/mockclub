"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { saveProfileAction } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

type Track = { slug: string; name: string };

/** Keep in sync with OTHER_TRACK_SLUG on the server. */
const OTHER = "other";

/** Mirrors LINK_TYPES / MIN_PROFILE_LINKS on the server. */
const LINK_TYPES = [
  { value: "website", label: "Website", hint: "yoursite.com" },
  { value: "linkedin", label: "LinkedIn", hint: "linkedin.com/in/you" },
  { value: "x", label: "X", hint: "x.com/you" },
  { value: "github", label: "GitHub", hint: "github.com/you" },
  { value: "facebook", label: "Facebook", hint: "facebook.com/you" },
  { value: "instagram", label: "Instagram", hint: "instagram.com/you" },
  { value: "youtube", label: "YouTube", hint: "youtube.com/@you" },
  { value: "other", label: "Other", hint: "any public profile" },
] as const;

const MIN_LINKS = 2;

type LinkRow = { type: string; url: string };

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
    customTrack?: string;
    level?: string;
    languages?: string[];
    timeZone?: string;
    links?: { type: string; url: string }[];
  } | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [track, setTrack] = useState(initial?.trackSlug ?? tracks[0].slug);
  const [customTrack, setCustomTrack] = useState(initial?.customTrack ?? "");
  const [level, setLevel] = useState(initial?.level ?? "entry");
  const [langs, setLangs] = useState<string[]>(
    initial?.languages ?? ["English"],
  );
  // Detected from the browser, always overridable, stored as an IANA id.
  const [links, setLinks] = useState<LinkRow[]>(
    initial?.links?.length
      ? initial.links
      : [
          { type: "linkedin", url: "" },
          { type: "github", url: "" },
        ],
  );
  const [tz, setTz] = useState(
    initial?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  function toggleLang(l: string) {
    setLangs((cur) =>
      cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l],
    );
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("trackSlug", track);
    if (track === OTHER) fd.set("customTrack", customTrack);
    fd.set("level", level);
    fd.set("timeZone", tz);
    langs.forEach((l) => fd.append("languages", l));
    fd.set("links", JSON.stringify(links.filter((l) => l.url.trim())));

    start(async () => {
      const res = await saveProfileAction(fd);
      setMsg(
        res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error },
      );
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label htmlFor="track" className="stamp-label text-ink-soft">
          Track
        </label>
        <select
          id="track"
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="mt-2 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
        >
          {tracks.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
          <option value={OTHER}>Something else…</option>
        </select>

        {track === OTHER && (
          <div className="mt-3">
            <label htmlFor="customTrack" className="stamp-label text-ink-soft">
              What are you practising for?
            </label>
            <input
              id="customTrack"
              value={customTrack}
              onChange={(e) => setCustomTrack(e.target.value)}
              maxLength={60}
              placeholder="e.g. Technical Writing, UX Research, Finance"
              className="mt-2 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
            />
            <p className="mt-2 text-sm text-ink-soft">
              If enough people ask for the same one, it becomes a real track.
            </p>
          </div>
        )}
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
                  : "border-ink/25 text-ink-soft hover:border-ink",
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="stamp-label text-ink-soft">
          Languages you can interview in
        </legend>
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
                  : "border-ink/25 text-ink-soft hover:border-ink",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="stamp-label text-ink-soft">
          Where people can find you ({MIN_LINKS}+ required)
        </legend>
        <p className="mt-2 text-sm text-ink-soft">
          This is how members know who they&apos;re talking to. Public profiles
          only — nothing private.
        </p>

        <div className="mt-3 space-y-3">
          {links.map((row, i) => {
            const meta =
              LINK_TYPES.find((t) => t.value === row.type) ?? LINK_TYPES[0];
            return (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Link type"
                  value={row.type}
                  onChange={(e) =>
                    setLinks((r) =>
                      r.map((x, j) =>
                        j === i ? { ...x, type: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-12 rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
                >
                  {LINK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`${meta.label} URL`}
                  value={row.url}
                  placeholder={meta.hint}
                  maxLength={300}
                  onChange={(e) =>
                    setLinks((r) =>
                      r.map((x, j) =>
                        j === i ? { ...x, url: e.target.value } : x,
                      ),
                    )
                  }
                  className="h-12 min-w-0 flex-1 rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
                />
                {links.length > MIN_LINKS && (
                  <button
                    type="button"
                    aria-label="Remove this link"
                    onClick={() => setLinks((r) => r.filter((_, j) => j !== i))}
                    className="inline-flex size-12 items-center justify-center border-[1.5px] border-ink/25 text-ink-soft transition-colors hover:border-vermilion-deep hover:text-vermilion-deep"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setLinks((r) => [...r, { type: "website", url: "" }])}
          className="mt-3 inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/25 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Plus className="size-4" /> Add another
        </button>
      </fieldset>

      <div>
        <label htmlFor="tz" className="stamp-label text-ink-soft">
          Timezone
        </label>
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
          <p
            role="status"
            className={cn(
              "text-sm font-medium",
              msg.ok ? "text-olive" : "text-vermilion-deep",
            )}
          >
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
