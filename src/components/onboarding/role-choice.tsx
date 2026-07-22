"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, Check } from "lucide-react";

import { chooseRoleAction } from "@/app/onboarding/actions";
import { cn } from "@/lib/utils";

type Choice = "interviewer" | "candidate";

export function RoleChoice({
  interviewers,
  waiting,
}: {
  interviewers: number;
  waiting: number;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!choice) return;
    start(async () => {
      const fd = new FormData();
      fd.set("choice", choice);
      const res = await chooseRoleAction(fd);
      if (res && !res.ok) setError(res.error);
    });
  }

  const options: {
    value: Choice;
    title: string;
    body: string;
    primary?: boolean;
    badge?: string;
  }[] = [
    {
      value: "interviewer",
      title: "I'll give an hour",
      body: "You've done the job and sat on the hiring side. Run mock interviews for people breaking in — your questions, your format, one hour at a time.",
      primary: true,
      badge: "Most needed",
    },
    {
      value: "candidate",
      title: "I want to practise",
      body: "Get a real interview with a working professional, in your language, and honest feedback afterwards. Always free.",
    },
  ];

  return (
    <div>
      {/* The honest ask: supply is the bottleneck, so say so. */}
      <p className="press bg-card p-4 text-sm leading-relaxed">
        Right now <span className="font-semibold">{waiting}</span>{" "}
        {waiting === 1 ? "person is" : "people are"} waiting to practise and
        only{" "}
        <span className="font-semibold text-vermilion-deep">
          {interviewers}
        </span>{" "}
        {interviewers === 1 ? "person has" : "people have"} offered to
        interview. Volunteers are what open the door.
      </p>

      <div className="mt-6 space-y-3">
        {options.map((o) => {
          const selected = choice === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setChoice(o.value)}
              aria-pressed={selected}
              className={cn(
                "block w-full border-[1.5px] p-5 text-start transition-all sm:p-6",
                selected
                  ? "border-vermilion-deep shadow-[5px_5px_0_0_var(--vermilion)]"
                  : "border-ink/25 hover:border-ink",
                o.primary && !selected && "border-ink",
              )}
            >
              <span className="flex items-start justify-between gap-4">
                <span>
                  <span className="display flex flex-wrap items-center gap-3 text-xl font-semibold sm:text-2xl">
                    {o.title}
                    {o.badge && (
                      <span className="stamp-label border border-vermilion-deep px-2 py-0.5 text-vermilion-deep">
                        {o.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block leading-relaxed text-ink-soft">
                    {o.body}
                  </span>
                </span>
                {selected && (
                  <Check
                    className="size-5 shrink-0 text-vermilion-deep"
                    strokeWidth={3}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!choice || pending}
        className="press press-hover mt-7 flex h-13 w-full items-center justify-center gap-2 rounded-none bg-vermilion-strong text-base font-medium text-chalk disabled:opacity-50"
      >
        {pending ? "Setting you up…" : "Continue"}
        {!pending && (
          <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
        )}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm font-medium text-vermilion-deep"
        >
          {error}
        </p>
      )}

      <p className="stamp-label mt-5 text-center text-ink-soft">
        You can change this any time
      </p>
    </div>
  );
}
