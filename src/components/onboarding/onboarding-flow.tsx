"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowUpRight, Check, Plus, X } from "lucide-react";

import { saveOnboardingStepAction } from "@/app/onboarding/actions";
import {
  INTERVIEW_TYPES,
  MAX_FOCUS_LENGTH,
  SEARCH_STAGES,
} from "@/content/candidate";
import {
  DISCIPLINES,
  FIELDS,
  MAX_SKILLS,
  disciplinesInFields,
  fieldsOf,
  inferDisciplines,
} from "@/content/skills";
import { cn } from "@/lib/utils";

type Draft = Record<string, unknown>;
type MemberRole = "candidate" | "interviewer";

/** Mirrors STEPS_FOR in server/onboarding/steps.ts. */
const STEPS_FOR = {
  interviewer: ["identity", "experience", "expertise", "trust"],
  candidate: ["identity", "goal", "situation", "trust"],
} as const;

type StepId =
  | "identity"
  | "experience"
  | "expertise"
  | "goal"
  | "situation"
  | "trust";

const TITLES: Record<MemberRole, Record<string, string>> = {
  interviewer: {
    identity: "About you",
    experience: "Your experience",
    expertise: "What you can interview on",
    trust: "How people know it's you",
  },
  candidate: {
    identity: "About you",
    goal: "What you're practising for",
    situation: "Where you are",
    trust: "So your interviewer can prepare",
  },
};

const LEVELS = [
  { value: "entry", label: "Entry" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "switcher", label: "Career switcher" },
];

const LINK_TYPES = [
  "linkedin",
  "github",
  "x",
  "website",
  "facebook",
  "instagram",
  "youtube",
  "other",
];

export function OnboardingFlow({
  role,
  initialStep,
  draft,
  languages,
  suggestedName,
  timeZones,
}: {
  role: MemberRole;
  initialStep: StepId;
  draft: Draft;
  languages: readonly string[];
  suggestedName: string;
  timeZones: string[];
}) {
  const isCandidate = role === "candidate";
  const STEPS = STEPS_FOR[role] as readonly StepId[];
  const [step, setStep] = useState<StepId>(initialStep);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Prefilled from Google, but editable — a Google display name is often not
  // the name someone wants to be interviewed under.
  const [fullName, setFullName] = useState(
    (draft.fullName as string) ?? suggestedName,
  );
  const [langs, setLangs] = useState<string[]>(
    (draft.languages as string[]) ?? ["English"],
  );

  const [level, setLevel] = useState((draft.level as string) ?? "");
  const [years, setYears] = useState(
    draft.yearsOfExperience === undefined
      ? ""
      : String(draft.yearsOfExperience),
  );
  // Named for the draft field, not `role` — that's the member role prop above.
  const currentRole = draft.currentRole as
    { company: string; role: string; current: boolean } | undefined;
  const [company, setCompany] = useState(currentRole?.company ?? "");
  const [jobTitle, setJobTitle] = useState(currentRole?.role ?? "");
  const [current, setCurrent] = useState(currentRole?.current ?? true);

  const [disciplines, setDisciplines] = useState<string[]>(
    (draft.disciplines as string[]) ?? [],
  );
  const [skills, setSkills] = useState<string[]>(
    (draft.skills as string[]) ?? [],
  );
  const [customSkill, setCustomSkill] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  // Which backgrounds they're from. Derived from any disciplines already
  // saved, so coming back to this step doesn't ask again.
  const [fields, setFields] = useState<string[]>(
    fieldsOf((draft.disciplines as string[]) ?? []),
  );

  /* Candidate-only state. */
  const [interviewTypes, setInterviewTypes] = useState<string[]>(
    (draft.interviewTypes as string[]) ?? [],
  );
  const [searchStage, setSearchStage] = useState(
    (draft.searchStage as string) ?? "",
  );
  const [cvUrl, setCvUrl] = useState((draft.cvUrl as string) ?? "");
  const [jobUrl, setJobUrl] = useState((draft.jobUrl as string) ?? "");
  const [focus, setFocus] = useState((draft.focus as string) ?? "");

  const minLinks = isCandidate ? 1 : 2;

  const [links, setLinks] = useState<{ type: string; url: string }[]>(
    (draft.links as { type: string; url: string }[]) ??
      (isCandidate
        ? [{ type: "linkedin", url: "" }]
        : [
            { type: "linkedin", url: "" },
            { type: "github", url: "" },
          ]),
  );
  const [timeZone, setTimeZone] = useState(
    (draft.timeZone as string) ??
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  const index = STEPS.indexOf(step);

  function toggle<T>(list: T[], value: T, set: (v: T[]) => void) {
    set(
      list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
    );
  }

  function payload(): Draft {
    switch (step) {
      case "identity":
        return { fullName, languages: langs };
      case "experience":
        return {
          level,
          yearsOfExperience: Number(years),
          company,
          role: jobTitle,
          current,
        };
      case "expertise":
        return { disciplines, skills };
      case "goal":
        return { disciplines, level, interviewTypes };
      case "situation":
        return {
          yearsOfExperience: Number(years),
          searchStage,
          company,
          role: jobTitle,
          current,
        };
      case "trust":
        return {
          links: links.filter((l) => l.url.trim()),
          timeZone,
          // Ignored server-side for interviewers; harmless to always send.
          cvUrl,
          jobUrl,
          focus,
        };
    }
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveOnboardingStepAction(step, payload());
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.complete) {
        window.location.href = "/dashboard";
        return;
      }
      if (res.next) {
        // Seed the next step from the job title — only when they haven't
        // chosen anything yet, so going Back and returning never overwrites a
        // real selection with a guess.
        if (
          (res.next === "expertise" || res.next === "goal") &&
          disciplines.length === 0
        ) {
          const guess = inferDisciplines(jobTitle);
          if (guess.length) {
            setDisciplines(guess);
            setSuggested(guess);
            setFields(fieldsOf(guess));
          }
        }
        setStep(res.next as StepId);
      }
    });
  }

  // Skills offered are the union of the chosen disciplines — picking "Frontend"
  // should not bury someone in Kubernetes.
  const offered = [
    ...new Set(
      DISCIPLINES.filter((d) => disciplines.includes(d.slug)).flatMap(
        (d) => d.skills,
      ),
    ),
  ];
  const customs = skills.filter((s) => !offered.includes(s));

  return (
    <div>
      <Progress index={index} total={STEPS.length} />

      <h1 className="display mt-6 text-3xl font-semibold sm:text-4xl">
        {TITLES[role][step]}
      </h1>

      <div className="mt-7">
        {step === "identity" && (
          <>
            <Field
              label="Your full name"
              hint={
                isCandidate
                  ? "This is what your interviewer will see."
                  : "This is what candidates will see."
              }
            >
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </Field>
            <Field
              label={
                isCandidate
                  ? "Languages you can be interviewed in"
                  : "Languages you can interview in"
              }
              hint={
                isCandidate
                  ? "Pick every language you'd be comfortable interviewing in."
                  : "Pick every language you're comfortable running an interview in."
              }
            >
              <Chips
                options={languages.map((l) => ({ value: l, label: l }))}
                selected={langs}
                onToggle={(v) => toggle(langs, v, setLangs)}
              />
            </Field>
          </>
        )}

        {step === "goal" && (
          <>
            <Field
              label="What are you practising for?"
              hint="Pick every area you want to be interviewed on."
            >
              <Chips
                options={disciplinesInFields(
                  fields.length ? fields : FIELDS.map((f) => f.slug),
                ).map((d) => ({ value: d.slug, label: d.name }))}
                selected={disciplines}
                onToggle={(v) => toggle(disciplines, v, setDisciplines)}
              />
            </Field>

            <Field
              label="The level you're interviewing at"
              hint="Where you're aiming, not where you are today — a career switcher's target is what matters."
            >
              <Chips
                options={LEVELS}
                selected={level ? [level] : []}
                onToggle={(v) => setLevel(v)}
              />
            </Field>

            <Field
              label="What kind of interview do you want?"
              hint="Pick as many as you like. This is what we match you on."
            >
              <div className="space-y-2">
                {INTERVIEW_TYPES.map((t) => (
                  <ChoiceCard
                    key={t.slug}
                    label={t.label}
                    hint={t.hint}
                    selected={interviewTypes.includes(t.slug)}
                    onSelect={() =>
                      toggle(interviewTypes, t.slug, setInterviewTypes)
                    }
                  />
                ))}
              </div>
            </Field>
          </>
        )}

        {step === "situation" && (
          <>
            <Field label="Years of experience">
              <input
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={cn(inputClass, "max-w-32")}
              />
            </Field>

            <Field
              label="Where are you in your search?"
              hint="While volunteers are scarce, this is how we decide who gets a slot first."
            >
              <div className="space-y-2">
                {SEARCH_STAGES.map((s) => (
                  <ChoiceCard
                    key={s.slug}
                    label={s.label}
                    hint={s.hint}
                    selected={searchStage === s.slug}
                    onSelect={() => setSearchStage(s.slug)}
                  />
                ))}
              </div>
            </Field>

            <Field
              label="Current role"
              hint="Optional — plenty of people here are between jobs, and that's often the point."
            >
              <div className="space-y-2">
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company"
                  className={inputClass}
                  autoComplete="organization"
                />
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Job title"
                  className={inputClass}
                  autoComplete="organization-title"
                />
              </div>
              <label className="mt-3 flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={current}
                  onChange={(e) => setCurrent(e.target.checked)}
                  className="size-4 accent-[var(--vermilion)]"
                />
                I still work here
              </label>
            </Field>
          </>
        )}

        {step === "experience" && (
          <>
            <Field label="The level you interview at">
              <Chips
                options={LEVELS}
                selected={level ? [level] : []}
                onToggle={(v) => setLevel(v)}
              />
            </Field>
            <Field label="Years of experience">
              <input
                type="number"
                min={0}
                max={50}
                inputMode="numeric"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={cn(inputClass, "max-w-32")}
              />
            </Field>
            <Field label="Company">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                autoComplete="organization"
              />
            </Field>
            <Field label="Job title">
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={inputClass}
                autoComplete="organization-title"
              />
            </Field>
            <label className="mt-4 flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={current}
                onChange={(e) => setCurrent(e.target.checked)}
                className="size-4 accent-[var(--vermilion)]"
              />
              I still work here
            </label>
          </>
        )}

        {step === "expertise" && (
          <>
            <Field
              label="What's your background?"
              hint="Pick every field you can interview in — this isn't only for developers."
            >
              {suggested.length > 0 && (
                <p className="press mb-3 bg-card p-3 text-sm leading-relaxed">
                  Pre-selected from{" "}
                  <span className="font-medium">{jobTitle}</span>. Change
                  anything that doesn&apos;t fit — this is only a guess.
                </p>
              )}
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
                        // Drop disciplines whose field was just removed, so a
                        // hidden option can't stay silently selected.
                        setDisciplines(
                          disciplines.filter((slug) =>
                            next.includes(
                              DISCIPLINES.find((d) => d.slug === slug)
                                ?.family ?? "",
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

              {fields.length > 0 && (
                <div className="mt-5">
                  <p className="font-medium">Specifically</p>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {disciplinesInFields(fields).map((d) => (
                      <button
                        key={d.slug}
                        type="button"
                        onClick={() =>
                          toggle(disciplines, d.slug, setDisciplines)
                        }
                        aria-pressed={disciplines.includes(d.slug)}
                        className={cn(
                          "border-[1.5px] p-3 text-start transition-all",
                          disciplines.includes(d.slug)
                            ? "border-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
                            : "border-ink/25 hover:border-ink",
                        )}
                      >
                        <span className="block font-medium">{d.name}</span>
                        <span className="mt-0.5 block text-sm text-ink-soft">
                          {d.note}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Field>

            {disciplines.length > 0 && (
              <Field
                label="Skills you're comfortable assessing"
                hint={`Up to ${MAX_SKILLS}. Add your own if something's missing.`}
              >
                <Chips
                  options={offered.map((s) => ({ value: s, label: s }))}
                  selected={skills}
                  onToggle={(v) => toggle(skills, v, setSkills)}
                />

                {customs.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customs.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1.5 border-[1.5px] border-vermilion-deep px-3 py-1.5 text-sm"
                      >
                        {s}
                        <button
                          type="button"
                          onClick={() =>
                            setSkills(skills.filter((x) => x !== s))
                          }
                          aria-label={`Remove ${s}`}
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
                      addCustom();
                    }}
                    placeholder="Something else…"
                    className={cn(inputClass, "h-11")}
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    className="flex h-11 shrink-0 items-center gap-1.5 border-[1.5px] border-ink px-4 text-sm font-medium"
                  >
                    <Plus className="size-4" /> Add
                  </button>
                </div>
              </Field>
            )}
          </>
        )}

        {step === "trust" && (
          <>
            <Field
              label={isCandidate ? "A link to you" : "Your public profiles"}
              hint={
                isCandidate
                  ? "One is enough — a CV, LinkedIn, GitHub or portfolio. Your interviewer is giving up an evening; this is how they know who they're meeting."
                  : "At least two. This is how members know who they're talking to."
              }
            >
              <div className="space-y-2">
                {links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select
                      value={l.type}
                      onChange={(e) => update(i, { type: e.target.value })}
                      className={cn(inputClass, "h-12 w-36 shrink-0")}
                    >
                      {LINK_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <input
                      value={l.url}
                      onChange={(e) => update(i, { url: e.target.value })}
                      placeholder="linkedin.com/in/you"
                      className={cn(inputClass, "h-12")}
                    />
                    {links.length > minLinks && (
                      <button
                        type="button"
                        onClick={() =>
                          setLinks(links.filter((_, x) => x !== i))
                        }
                        aria-label="Remove link"
                        className="shrink-0 px-2"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setLinks([...links, { type: "other", url: "" }])}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-vermilion-deep"
              >
                <Plus className="size-4" /> Add another
              </button>
            </Field>

            <Field
              label="Your time zone"
              hint="Used to show your times correctly."
            >
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className={cn(inputClass, "h-12")}
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </Field>

            {/* Everything below is optional context. It exists so the person
                giving up an evening can walk in prepared — never as a gate. */}
            {isCandidate && (
              <>
                <Field
                  label="Your CV"
                  hint="A link, not a file — Google Drive, Notion, a PDF anywhere. Optional."
                >
                  <input
                    value={cvUrl}
                    onChange={(e) => setCvUrl(e.target.value)}
                    placeholder="drive.google.com/…"
                    inputMode="url"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="The job you're aiming at"
                  hint="Link a job description and your interviewer can rehearse the real thing. Optional."
                >
                  <input
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    placeholder="careers.example.com/…"
                    inputMode="url"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="What do you most want help with?"
                  hint="The one thing you'd fix if you could. This is what your interviewer reads first."
                >
                  <textarea
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    maxLength={MAX_FOCUS_LENGTH}
                    rows={3}
                    placeholder="I freeze on system design questions and ramble instead of asking about scale."
                    className={cn(inputClass, "h-auto py-2.5")}
                  />
                  <p className="mt-1.5 text-end text-xs text-ink-soft tabular-nums">
                    {focus.length}/{MAX_FOCUS_LENGTH}
                  </p>
                </Field>
              </>
            )}
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 text-sm font-medium text-vermilion-deep"
        >
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setStep(STEPS[index - 1])}
            className="flex h-13 items-center gap-2 border-[1.5px] border-ink px-5 text-sm font-medium"
          >
            <ArrowLeft className="size-4 rtl:-scale-x-100" /> Back
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="press press-hover flex h-13 flex-1 items-center justify-center gap-2 bg-vermilion-strong text-base font-medium text-chalk disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : index === STEPS.length - 1
              ? "Finish"
              : "Continue"}
          {!pending &&
            (index === STEPS.length - 1 ? (
              <Check className="size-4" strokeWidth={2.5} />
            ) : (
              <ArrowUpRight
                className="size-4 rtl:-scale-x-100"
                strokeWidth={2.5}
              />
            ))}
        </button>
      </div>

      <p className="stamp-label mt-5 text-center text-ink-soft">
        {/* Precise on purpose: a step is saved when it's submitted, not while
            it's being typed. "Saved as you go" implied keystroke autosave and
            would read as data loss if someone closed a half-filled step. */}
        Each step is saved when you continue — you can come back any time
      </p>
    </div>
  );

  function addCustom() {
    const v = customSkill.trim();
    if (!v || skills.includes(v)) return;
    setSkills([...skills, v]);
    setCustomSkill("");
  }

  function update(i: number, patch: Partial<{ type: string; url: string }>) {
    setLinks(links.map((l, x) => (x === i ? { ...l, ...patch } : l)));
  }
}

const inputClass =
  "h-12 w-full rounded-none border-[1.5px] border-ink bg-paper px-3 text-base text-ink outline-none transition-shadow placeholder:text-ink-soft focus-visible:shadow-[4px_4px_0_0_var(--vermilion)]";

function Progress({ index, total }: { index: number; total: number }) {
  return (
    <div>
      <p className="stamp-label text-ink-soft">
        Step {index + 1} of {total}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 transition-colors",
              i <= index ? "bg-vermilion" : "bg-ink/15",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="font-medium">{label}</p>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/**
 * A full-width choice with a line of explanation under it.
 *
 * Chips work when the label is self-explanatory ("Mid", "English"). Interview
 * types and search stages are not — "Role-specific" and "Just exploring" both
 * need a sentence, and a sentence doesn't fit in a chip.
 *
 * Named ChoiceCard, not Option: `Option` is a DOM global (HTMLOptionElement)
 * and shadowing it makes TypeScript resolve the constructor instead.
 */
function ChoiceCard({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 border-[1.5px] p-3.5 text-start transition-all",
        selected
          ? "border-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
          : "border-ink/25 hover:border-ink",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center border-[1.5px]",
          selected ? "border-vermilion-deep bg-vermilion-deep" : "border-ink/40",
        )}
        aria-hidden
      >
        {selected && <Check className="size-3 text-chalk" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-medium",
            selected && "text-vermilion-deep",
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-sm text-ink-soft">{hint}</span>
      </span>
    </button>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onToggle(o.value)}
          aria-pressed={selected.includes(o.value)}
          className={cn(
            "min-h-11 border-[1.5px] px-3.5 py-2 text-sm font-medium transition-all",
            selected.includes(o.value)
              ? "border-vermilion-deep text-vermilion-deep shadow-[3px_3px_0_0_var(--vermilion)]"
              : "border-ink/25 text-ink-soft hover:border-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
