"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

import { cn } from "@/lib/utils";

type ContactType = "email" | "whatsapp" | "telegram" | "linkedin";
type Role = "candidate" | "interviewer";

const METHODS: {
  type: ContactType;
  label: string;
  placeholder: string;
  inputMode: "email" | "tel" | "text";
}[] = [
  {
    type: "email",
    label: "Email",
    placeholder: "you@example.com",
    inputMode: "email",
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    placeholder: "+8801… or wa.me link",
    inputMode: "tel",
  },
  {
    type: "telegram",
    label: "Telegram",
    placeholder: "@yourhandle",
    inputMode: "text",
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    placeholder: "linkedin.com/in/you",
    inputMode: "text",
  },
];

const ROLES: { value: Role; label: string }[] = [
  { value: "candidate", label: "I want to practise" },
  { value: "interviewer", label: "I want to give an hour" },
];

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; already: boolean; method: ContactType }
  | { kind: "error"; message: string };

export function WaitlistForm() {
  const [method, setMethod] = useState<ContactType>("email");
  const [role, setRole] = useState<Role>("candidate");
  const [value, setValue] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [state, setState] = useState<State>({ kind: "idle" });

  const active = METHODS.find((m) => m.type === method)!;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contactType: method,
          contactValue: value,
          role,
          company,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({
          kind: "error",
          message: data.error ?? "Something went wrong.",
        });
        return;
      }
      setState({ kind: "done", already: data.status === "already", method });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="press mx-auto max-w-lg bg-card p-8 text-start">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-vermilion-strong text-chalk">
            <Check className="size-5" strokeWidth={2.5} />
          </span>
          <p className="display text-2xl font-semibold">
            {state.already
              ? "You're already on the list."
              : "You're on the list."}
          </p>
        </div>
        <p className="mt-4 leading-relaxed text-ink-soft">
          We&apos;ll reach out on your {labelFor(state.method)} the moment the
          first group opens. Thank you for being early — it genuinely helps us
          know how many people to gather.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg text-start">
      {/* honeypot — hidden from humans, catnip for bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <fieldset>
        <legend className="stamp-label text-ink-soft">
          How should we reach you?
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {METHODS.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => setMethod(m.type)}
              aria-pressed={method === m.type}
              className={cn(
                "min-h-11 border-[1.5px] px-3 py-2.5 text-sm font-medium transition-all",
                method === m.type
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/25 text-ink-soft hover:border-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4">
        <label htmlFor="contact" className="sr-only">
          Your {active.label}
        </label>
        <input
          id="contact"
          type="text"
          inputMode={active.inputMode}
          required
          autoComplete="off"
          placeholder={active.placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          className="h-13 w-full rounded-none border-[1.5px] border-ink bg-paper px-4 text-base text-ink outline-none transition-shadow placeholder:text-ink-soft focus-visible:shadow-[4px_4px_0_0_var(--vermilion)]"
        />
      </div>

      <fieldset className="mt-4">
        <legend className="sr-only">Are you practising or volunteering?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={cn(
                "min-h-11 border-[1.5px] px-3 py-2.5 text-sm font-medium transition-all",
                role === r.value
                  ? "border-vermilion-deep text-vermilion-deep"
                  : "border-ink/25 text-ink-soft hover:border-ink",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={state.kind === "submitting"}
        className="press press-hover mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-none bg-vermilion-strong text-base font-medium text-chalk disabled:opacity-70"
      >
        {state.kind === "submitting" ? (
          "Adding you…"
        ) : (
          <>
            Reserve my seat
            <ArrowUpRight
              className="size-4 rtl:-scale-x-100"
              strokeWidth={2.5}
            />
          </>
        )}
      </button>

      {state.kind === "error" && (
        <p
          role="alert"
          className="mt-3 text-sm font-medium text-vermilion-deep"
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function labelFor(type: ContactType) {
  return METHODS.find((m) => m.type === type)?.label ?? "contact";
}
