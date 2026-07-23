"use client";

import { useState } from "react";

import { GoogleMark } from "@/components/google-mark";
import { signIn } from "@/lib/auth-client";

export function GoogleSignIn({
  callbackURL = "/dashboard",
}: {
  callbackURL?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await signIn.social({ provider: "google", callbackURL });
    } catch {
      setError("Couldn't reach Google. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="press press-hover flex h-13 w-full items-center justify-center gap-3 rounded-none border-[1.5px] border-ink bg-card text-base font-medium disabled:opacity-70"
      >
        <GoogleMark className="size-5" />
        {busy ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      {error && (
        <p
          role="alert"
          className="mt-3 text-center text-sm font-medium text-vermilion-deep"
        >
          {error}
        </p>
      )}
    </div>
  );
}
