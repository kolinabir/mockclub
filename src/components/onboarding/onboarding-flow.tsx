"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowUpRight, Check, Plus, X } from "lucide-react";

import { saveOnboardingStepAction } from "@/app/onboarding/actions";
import { DISCIPLINES, MAX_SKILLS } from "@/content/skills";
import { cn } from "@/lib/utils";

type Draft = Record<string, unknown>;

const STEPS = ["identity", "experience", "expertise", "trust"] as const;
type StepId = (typeof STEPS)[number];

const TITLES: Record<StepId, string> = {
  identity: "About you",
  experience: "Your experience",
  expertise: "What you can interview on",
  trust: "How people know it's you",
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
  initialStep,
  draft,
  languages,
  suggestedName,
  timeZones,
}: {
  initialStep: StepId;
  draft: Draft;
  languages: readonly string[];
  suggestedName: string;
  timeZones: string[];
}) {
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
  const role = draft.currentRole as
    { company: string; role: string; current: boolean } | undefined;
  const [company, setCompany] = useState(role?.company ?? "");
  const [jobTitle, setJobTitle] = useState(role?.role ?? "");
  const [current, setCurrent] = useState(role?.current ?? true);

  const [disciplines, setDisciplines] = useState<string[]>(
    (draft.disciplines as string[]) ?? [],
  );
  const [skills, setSkills] = useState<string[]>(
    (draft.skills as string[]) ?? [],
  );
  const [customSkill, setCustomSkill] = useState("");

  const [links, setLinks] = useState<{ type: string; url: string }[]>(
    (draft.links as { type: string; url: string }[]) ?? [
      { type: "linkedin", url: "" },
      { type: "github", url: "" },
    ],
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
      case "trust":
        return { links: links.filter((l) => l.url.trim()), timeZone };
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
      if (res.next) setStep(res.next as StepId);
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
      <Progress index={index} />

      <h1 className="display mt-6 text-3xl font-semibold sm:text-4xl">
        {TITLES[step]}
      </h1>

      <div className="mt-7">
        {step === "identity" && (
          <>
            <Field
              label="Your full name"
              hint="This is what candidates will see."
            >
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </Field>
            <Field
              label="Languages you can interview in"
              hint="Pick every language you're comfortable running an interview in."
            >
              <Chips
                options={languages.map((l) => ({ value: l, label: l }))}
                selected={langs}
                onToggle={(v) => toggle(langs, v, setLangs)}
              />
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
              label="Areas you can interview in"
              hint="Pick as many as apply. The skills below follow from these."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {DISCIPLINES.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggle(disciplines, d.slug, setDisciplines)}
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
              label="Your public profiles"
              hint="At least two. This is how members know who they're talking to."
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
                    {links.length > 2 && (
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
        Your answers are saved as you go
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

function Progress({ index }: { index: number }) {
  return (
    <div>
      <p className="stamp-label text-ink-soft">
        Step {index + 1} of {STEPS.length}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s}
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
