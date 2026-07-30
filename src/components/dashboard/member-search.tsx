"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The members-directory search box.
 *
 * Searching stays explicit — nothing happens until Search is clicked (or
 * Enter), exactly like a plain GET form. The one added behaviour: when the box
 * is CLEARED while the URL still carries a query, the stale results would sit
 * there looking current. After a short pause the query is dropped from the URL
 * on its own, so the list falls back to whatever filter chip is selected.
 */
const CLEAR_DELAY_MS = 1200;

export function MemberSearch({
  initialQ,
  filter,
}: {
  initialQ: string;
  filter: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQ);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function onChange(v: string) {
    setValue(v);
    if (timer.current) window.clearTimeout(timer.current);

    // Only the emptied-out case auto-navigates; typing never auto-searches.
    if (v.trim() === "" && initialQ) {
      timer.current = window.setTimeout(() => {
        const p = new URLSearchParams();
        if (filter !== "all") p.set("filter", filter);
        const s = p.toString();
        router.replace(`/dashboard/admin/members${s ? `?${s}` : ""}`);
      }, CLEAR_DELAY_MS);
    }
  }

  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name or email…"
        className="h-11 w-full max-w-xs rounded-none border-[1.5px] border-ink/35 bg-paper px-3 text-base outline-none transition-all placeholder:text-ink-soft/70 focus-visible:border-ink focus-visible:shadow-[3px_3px_0_0_var(--vermilion)]"
      />
      <button
        type="submit"
        className="h-11 border-[1.5px] border-ink px-4 text-sm font-medium transition-colors hover:bg-ink hover:text-paper"
      >
        Search
      </button>
    </form>
  );
}
