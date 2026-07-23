"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

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

type SectionId =
  | "track"
  | "languages"
  | "links"
  | "experience"
  | "skills"
  | "timezone";

/** Shared text-control style: quiet at rest, letterpress pop on focus. */
const FIELD =
  "rounded-none border-[1.5px] border-ink/35 bg-paper px-3 text-base text-ink " +
  "outline-none transition-all placeholder:text-ink-soft/70 " +
  "focus-visible:border-ink focus-visible:shadow-[3px_3px_0_0_var(--vermilion)]";

/** Record-style row for view mode — same construction as the membership card. */
function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-1.5">
      <dt className="stamp-label shrink-0 text-[0.625rem] text-ink-soft">
        {label}
      </dt>
      <dd className="min-w-0 text-end font-medium">{value}</dd>
    </div>
  );
}

/** Non-interactive value chip for view mode. */
function ValueChip({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "border-[1.5px] px-3 py-1.5 text-sm font-medium",
        accent ? "border-vermilion-deep/60 text-ink" : "border-ink/20 text-ink",
      )}
    >
      {children}
    </span>
  );
}

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

  // Which card is armed for editing (one at a time), and where the last
  // successful save happened — so "Saved." shows on the right card.
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [savedIn, setSavedIn] = useState<SectionId | null>(null);

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

  // Snapshot of everything when a card enters edit mode; Cancel restores it.
  // Restoring the full snapshot is safe because only one card can change.
  const snapshot = useRef<{
    track: string;
    customTrack: string;
    level: string;
    years: string;
    company: string;
    jobTitle: string;
    stillHere: boolean;
    disciplines: string[];
    skills: string[];
    fields: string[];
    langs: string[];
    links: LinkRow[];
    tz: string;
  } | null>(null);

  function takeSnapshot() {
    snapshot.current = {
      track,
      customTrack,
      level,
      years,
      company,
      jobTitle,
      stillHere,
      disciplines,
      skills,
      fields,
      langs,
      links: links.map((l) => ({ ...l })),
      tz,
    };
  }

  function restoreSnapshot() {
    const s = snapshot.current;
    if (!s) return;
    setTrack(s.track);
    setCustomTrack(s.customTrack);
    setLevel(s.level);
    setYears(s.years);
    setCompany(s.company);
    setJobTitle(s.jobTitle);
    setStillHere(s.stillHere);
    setDisciplines(s.disciplines);
    setSkills(s.skills);
    setFields(s.fields);
    setLangs(s.langs);
    setLinks(s.links);
    setTz(s.tz);
  }

  function startEdit(id: SectionId) {
    // Switching cards without saving discards the abandoned card's changes.
    if (editing !== null) restoreSnapshot();
    takeSnapshot();
    setEditing(id);
    setSavedIn(null);
    setMsg(null);
  }

  function cancelEdit() {
    restoreSnapshot();
    setEditing(null);
    setMsg(null);
  }

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
    if (editing === null) return;
    const section = editing;
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
      if (res.ok) {
        snapshot.current = null;
        setEditing(null);
        setSavedIn(section);
        setMsg(null);
      } else {
        setMsg({ ok: false, text: res.error });
      }
    });
  }

  /** Save/Cancel footer inside the card being edited. */
  function editFooter() {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/15 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-none bg-vermilion-strong px-6 text-sm font-medium text-chalk transition-opacity disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={pending}
          className="h-11 border-[1.5px] border-ink/30 px-5 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-70"
        >
          Cancel
        </button>
        {msg && !msg.ok && (
          <p role="alert" className="text-sm font-medium text-vermilion-deep">
            {msg.text}
          </p>
        )}
      </div>
    );
  }

  /**
   * A numbered record card. View mode shows the typeset record; the header's
   * Edit control arms just this card.
   */
  function section(
    id: SectionId,
    n: string,
    title: string,
    view: ReactNode,
    edit: ReactNode,
  ) {
    const isEditing = editing === id;
    return (
      <section className="border-[1.5px] border-ink/15 bg-card">
        <header className="flex items-center justify-between gap-3 border-b border-ink/15 px-5 py-3">
          <h2 className="stamp-label text-[0.6875rem]">
            <span className="me-2.5 text-ink-soft">§ {n}</span>
            {title}
          </h2>
          {isEditing ? (
            <span className="stamp-label text-[0.625rem] text-vermilion-deep">
              Editing
            </span>
          ) : (
            <span className="flex items-center gap-3">
              {savedIn === id && (
                <span role="status" className="text-xs font-medium text-olive">
                  Saved.
                </span>
              )}
              <button
                type="button"
                onClick={() => startEdit(id)}
                className="stamp-label flex items-center gap-1.5 text-[0.625rem] text-ink-soft transition-colors hover:text-vermilion-deep"
              >
                <Pencil className="size-3" strokeWidth={2.5} />
                Edit
              </button>
            </span>
          )}
        </header>
        <div className="px-5 py-6">
          {isEditing ? (
            <>
              {edit}
              {editFooter()}
            </>
          ) : (
            view
          )}
        </div>
      </section>
    );
  }

  const trackName =
    track === OTHER
      ? customTrack || "Custom track"
      : (tracks.find((t) => t.slug === track)?.name ?? track);
  const levelLabel = LEVELS.find((l) => l.value === level)?.label ?? level;
  const filledLinks = links.filter((l) => l.url.trim());
  const disciplineNames = DISCIPLINES.filter((d) =>
    disciplines.includes(d.slug),
  ).map((d) => d.name);

  return (
    <form onSubmit={submit} className="space-y-5">
      {section(
        "track",
        "01",
        "Track & level",
        /* view */
        <dl>
          <Row label="Track" value={trackName} />
          <Row label="Level" value={levelLabel} />
        </dl>,
        /* edit */
        <div>
          <label htmlFor="track" className="text-sm font-medium">
            Track
          </label>
          <select
            id="track"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className={cn(FIELD, "mt-1.5 h-12 w-full")}
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
              <label htmlFor="customTrack" className="text-sm font-medium">
                What are you practising for?
              </label>
              <input
                id="customTrack"
                value={customTrack}
                onChange={(e) => setCustomTrack(e.target.value)}
                maxLength={60}
                placeholder="e.g. Technical Writing, UX Research, Finance"
                className={cn(FIELD, "mt-1.5 h-12 w-full")}
              />
              <p className="mt-2 text-sm text-ink-soft">
                If enough people ask for the same one, it becomes a real track.
              </p>
            </div>
          )}

          <fieldset className="mt-6">
            <legend className="text-sm font-medium">Level</legend>
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
                      : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>,
      )}

      {section(
        "languages",
        "02",
        "Languages",
        /* view */
        langs.length ? (
          <div className="flex flex-wrap gap-2">
            {langs.map((l) => (
              <ValueChip key={l}>{l}</ValueChip>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">No languages selected yet.</p>
        ),
        /* edit */
        <fieldset>
          <legend className="sr-only">Languages you can interview in</legend>
          <p className="text-sm text-ink-soft">
            Every language you could comfortably run a session in.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
                    : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>,
      )}

      {section(
        "links",
        "03",
        "Where people can find you",
        /* view */
        filledLinks.length ? (
          <ul className="space-y-2.5">
            {filledLinks.map((row, i) => {
              const meta =
                LINK_TYPES.find((t) => t.value === row.type) ?? LINK_TYPES[0];
              const href = /^https?:\/\//i.test(row.url)
                ? row.url
                : `https://${row.url}`;
              return (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-6"
                >
                  <span className="stamp-label shrink-0 text-[0.625rem] text-ink-soft">
                    {meta.label}
                  </span>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-end font-medium underline-offset-4 hover:underline"
                  >
                    {row.url.replace(/^https?:\/\//i, "")}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">
            No links yet — add at least {MIN_LINKS} public profiles.
          </p>
        ),
        /* edit */
        <fieldset>
          <legend className="sr-only">
            Where people can find you ({MIN_LINKS}+ required)
          </legend>
          <p className="text-sm text-ink-soft">
            At least {MIN_LINKS} public profiles — this is how members know who
            they&apos;re talking to. Nothing private.
          </p>

          <div className="mt-4 space-y-3">
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
                    className={cn(FIELD, "h-12")}
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
                    className={cn(FIELD, "h-12 min-w-0 flex-1")}
                  />
                  {links.length > MIN_LINKS && (
                    <button
                      type="button"
                      aria-label="Remove this link"
                      onClick={() =>
                        setLinks((r) => r.filter((_, j) => j !== i))
                      }
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
            onClick={() =>
              setLinks((r) => [...r, { type: "website", url: "" }])
            }
            className="mt-3 inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/25 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            <Plus className="size-4" /> Add another
          </button>
        </fieldset>,
      )}

      {/* Filled in by onboarding; editable here so the profile stays the one
          place a member maintains their details. */}
      {section(
        "experience",
        "04",
        "Experience",
        /* view */
        <dl>
          <Row label="Years" value={years === "" ? "—" : years} />
          <Row label="Company" value={company.trim() || "—"} />
          <Row label="Job title" value={jobTitle.trim() || "—"} />
          <Row
            label="Status"
            value={stillHere ? "Currently working here" : "Past role"}
          />
        </dl>,
        /* edit */
        <fieldset>
          <legend className="sr-only">Experience</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Years of experience</span>
              <input
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={cn(FIELD, "mt-1.5 h-12 w-full")}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Company</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                className={cn(FIELD, "mt-1.5 h-12 w-full")}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium">Job title</span>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                autoComplete="organization-title"
                className={cn(FIELD, "mt-1.5 h-12 w-full")}
              />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={stillHere}
              onChange={(e) => setStillHere(e.target.checked)}
              className="size-4 accent-[var(--vermilion)]"
            />
            I still work here
          </label>
        </fieldset>,
      )}

      {section(
        "skills",
        "05",
        "Background & skills",
        /* view */
        disciplineNames.length || skills.length ? (
          <div className="space-y-4">
            {disciplineNames.length > 0 && (
              <div>
                <p className="stamp-label text-[0.625rem] text-ink-soft">
                  Areas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {disciplineNames.map((name) => (
                    <ValueChip key={name} accent>
                      {name}
                    </ValueChip>
                  ))}
                </div>
              </div>
            )}
            {skills.length > 0 && (
              <div>
                <p className="stamp-label text-[0.625rem] text-ink-soft">
                  Skills
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {skills.map((sk) => (
                    <ValueChip key={sk}>{sk}</ValueChip>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Nothing selected yet — pick the areas you can interview in.
          </p>
        ),
        /* edit */
        <fieldset>
          <legend className="sr-only">
            Background &amp; areas you can interview in
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
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
                          DISCIPLINES.find((d) => d.slug === slug)?.family ??
                            "",
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
            <div className="mt-5 border-t border-ink/15 pt-5">
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
                          on
                            ? skills.filter((x) => x !== sk)
                            : [...skills, sk],
                        )
                      }
                      className={cn(
                        "min-h-11 border-[1.5px] px-3.5 py-2 text-sm font-medium transition-all",
                        on
                          ? "border-vermilion-deep text-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
                          : "border-ink/25 text-ink-soft hover:border-ink hover:text-ink",
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
                        onClick={() =>
                          setSkills(skills.filter((x) => x !== sk))
                        }
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
                  className={cn(FIELD, "h-11 w-full")}
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="flex h-11 shrink-0 items-center gap-1.5 border-[1.5px] border-ink px-4 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
                >
                  <Plus className="size-4" /> Add
                </button>
              </div>
            </div>
          )}
        </fieldset>,
      )}

      {section(
        "timezone",
        "06",
        "Timezone",
        /* view */
        <div>
          <p className="font-medium">{tz}</p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Everything you see is shown in this zone.
          </p>
        </div>,
        /* edit */
        <div>
          <label htmlFor="tz" className="text-sm font-medium">
            Your timezone
          </label>
          <input
            id="tz"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className={cn(FIELD, "mt-1.5 h-12 w-full")}
          />
          <p className="mt-2 text-sm text-ink-soft">
            Detected automatically. Everything you see is shown in this zone.
          </p>
        </div>,
      )}
    </form>
  );
}
