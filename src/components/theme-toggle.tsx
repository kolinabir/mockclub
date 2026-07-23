"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  // The server can't know the user's theme, so render a neutral placeholder
  // until hydration — otherwise the icon flips visibly on load. useSyncExternalStore
  // gives us "am I on the client yet" without setting state inside an effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`inline-flex size-9 items-center justify-center border border-ink/20 text-ink-soft transition-colors hover:border-ink hover:text-vermilion ${className}`}
    >
      {mounted && isDark ? (
        <Sun className="size-4" strokeWidth={2} />
      ) : (
        <Moon className="size-4" strokeWidth={2} />
      )}
    </button>
  );
}
