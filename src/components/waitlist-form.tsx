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
  { value: "interviewer", label: "I'll give an hour" },
];

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; already: boolean; method: ContactType }
  | { kind: "error"; message: string };

/**
 * One action, one object. The role picker and contact-method picker are
 * deliberately typographic (a segmented toggle, underlined text tabs) so the
 * fused input+button bar is the only heavy element — the eye lands there.
 */
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
    <form onSubmit={onSubmit} className="mx-auto max-w-xl">
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

      {/* 1 — who you are: one bordered object, two halves */}
      <fieldset>
        <legend className="sr-only">Are you practising or volunteering?</legend>
        <div className="mx-auto grid w-fit grid-cols-2 border-[1.5px] border-ink">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={cn(
                "min-h-11 px-5 text-sm font-medium transition-colors sm:px-7",
                role === r.value
                  ? "bg-ink text-paper"
                  : "bg-transparent text-ink-soft hover:text-ink",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* 2 — where to reach you: typographic tabs, no boxes */}
      <fieldset className="mt-8">
        <legend className="sr-only">How should we reach you?</legend>
        <div className="flex flex-wrap items-baseline justify-center gap-x-6 gap-y-2 sm:gap-x-7">
          {METHODS.map((m) => (
            <button
              key={m.type}
              type="button"
              onClick={() => setMethod(m.type)}
              aria-pressed={method === m.type}
              className={cn(
                "stamp-label border-b-2 pb-1.5 text-[0.6875rem] transition-colors",
                method === m.type
                  ? "border-vermilion text-ink"
                  : "border-transparent text-ink-soft hover:text-ink",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* 3 — the one heavy element on the page: input and action, fused */}
      <div className="press mt-4 flex flex-col bg-card transition-shadow focus-within:shadow-[5px_5px_0_0_var(--vermilion)] sm:flex-row">
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
          className="h-14 min-w-0 flex-1 rounded-none border-0 bg-transparent px-5 text-base text-ink outline-none placeholder:text-ink-soft"
        />
        <button
          type="submit"
          disabled={state.kind === "submitting"}
          className="flex h-13 shrink-0 items-center justify-center gap-2 border-t-[1.5px] border-ink bg-vermilion-strong px-7 text-base font-medium text-chalk transition-opacity disabled:opacity-70 sm:h-14 sm:border-s-[1.5px] sm:border-t-0"
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
      </div>

      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-sm font-medium text-vermilion-deep">
          {state.message}
        </p>
      )}
    </form>
  );
}

function labelFor(type: ContactType) {
  return METHODS.find((m) => m.type === type)?.label ?? "contact";
}
