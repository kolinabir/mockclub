"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X } from "lucide-react";

import { saveProfileAction } from "@/app/dashboard/actions";
import {
  DISCIPLINES,
  FIELDS,
  disciplinesInFields,
  fieldsOf,
} from "@/content/skills";
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
    yearsOfExperience?: number;
    currentRole?: { company: string; role: string; current: boolean };
    disciplines?: string[];
    skills?: string[];
  } | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [track, setTrack] = useState(initial?.trackSlug ?? tracks[0].slug);
  const [customTrack, setCustomTrack] = useState(initial?.customTrack ?? "");
  const [level, setLevel] = useState(initial?.level ?? "entry");
  const [years, setYears] = useState(
    initial?.yearsOfExperience === undefined
      ? ""
      : String(initial.yearsOfExperience),
  );
  const [company, setCompany] = useState(initial?.currentRole?.company ?? "");
  const [jobTitle, setJobTitle] = useState(initial?.currentRole?.role ?? "");
  const [stillHere, setStillHere] = useState(
    initial?.currentRole?.current ?? true,
  );
  const [disciplines, setDisciplines] = useState<string[]>(
    initial?.disciplines ?? [],
  );
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [customSkill, setCustomSkill] = useState("");
  const [fields, setFields] = useState<string[]>(
    fieldsOf(initial?.disciplines ?? []),
  );

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

  // Skills follow from the chosen disciplines, same as onboarding.
  const offeredSkills = [
    ...new Set(
      DISCIPLINES.filter((d) => disciplines.includes(d.slug)).flatMap(
        (d) => d.skills,
      ),
    ),
  ];
  const customSkills = skills.filter((sk) => !offeredSkills.includes(sk));

  function addCustomSkill() {
    const v = customSkill.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setCustomSkill("");
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
    fd.set("yearsOfExperience", years);
    fd.set("company", company);
    fd.set("role", jobTitle);
    fd.set("current", stillHere ? "on" : "");
    fd.set("disciplines", JSON.stringify(disciplines));
    fd.set("skills", JSON.stringify(skills));

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

      {/* Filled in by onboarding; editable here so the profile stays the one
          place a member maintains their details. */}
      <fieldset>
        <legend className="stamp-label text-ink-soft">Experience</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Years of experience</span>
            <input
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1.5 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Company</span>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              autoComplete="organization"
              className="mt-1.5 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Job title</span>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              autoComplete="organization-title"
              className="mt-1.5 h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
            />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={stillHere}
            onChange={(e) => setStillHere(e.target.checked)}
            className="size-4 accent-[var(--vermilion)]"
          />
          I still work here
        </label>
      </fieldset>

      <fieldset>
        <legend className="stamp-label text-ink-soft">
          Background &amp; areas you can interview in
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {FIELDS.map((f) => {
            const on = fields.includes(f.slug);
            return (
              <button
                key={f.slug}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  const next = on
                    ? fields.filter((x) => x !== f.slug)
                    : [...fields, f.slug];
                  setFields(next);
                  setDisciplines(
                    disciplines.filter((slug) =>
                      next.includes(
                        DISCIPLINES.find((d) => d.slug === slug)?.family ?? "",
                      ),
                    ),
                  );
                }}
                className={cn(
                  "border-[1.5px] p-3 text-start transition-all",
                  on
                    ? "border-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
                    : "border-ink/25 hover:border-ink",
                )}
              >
                <span className="block font-medium">{f.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {f.note}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {disciplinesInFields(fields).map((d) => {
            const on = disciplines.includes(d.slug);
            return (
              <button
                key={d.slug}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setDisciplines(
                    on
                      ? disciplines.filter((x) => x !== d.slug)
                      : [...disciplines, d.slug],
                  )
                }
                className={cn(
                  "border-[1.5px] p-3 text-start transition-all",
                  on
                    ? "border-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
                    : "border-ink/25 hover:border-ink",
                )}
              >
                <span className="block font-medium">{d.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {d.note}
                </span>
              </button>
            );
          })}
        </div>

        {disciplines.length > 0 && (
          <div className="mt-4">
            <span className="text-sm font-medium">Skills</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {offeredSkills.map((sk) => {
                const on = skills.includes(sk);
                return (
                  <button
                    key={sk}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setSkills(
                        on ? skills.filter((x) => x !== sk) : [...skills, sk],
                      )
                    }
                    className={cn(
                      "min-h-11 border-[1.5px] px-3.5 py-2 text-sm font-medium transition-all",
                      on
                        ? "border-vermilion-deep text-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
                        : "border-ink/25 text-ink-soft hover:border-ink",
                    )}
                  >
                    {sk}
                  </button>
                );
              })}
            </div>

            {customSkills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {customSkills.map((sk) => (
                  <span
                    key={sk}
                    className="flex items-center gap-1.5 border-[1.5px] border-vermilion-deep px-3 py-1.5 text-sm"
                  >
                    {sk}
                    <button
                      type="button"
                      aria-label={`Remove ${sk}`}
                      onClick={() => setSkills(skills.filter((x) => x !== sk))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addCustomSkill();
                }}
                placeholder="Something else…"
                className="h-11 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="flex h-11 shrink-0 items-center gap-1.5 border-[1.5px] border-ink px-4 text-sm font-medium"
              >
                <Plus className="size-4" /> Add
              </button>
            </div>
          </div>
        )}
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
