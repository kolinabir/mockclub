"use client";

import { useTransition } from "react";
import { ArrowUpRight } from "lucide-react";

import { becomeInterviewerAction } from "@/app/dashboard/actions";

/** The candidate → interviewer flywheel, made one click. */
export function BecomeInterviewer() {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await becomeInterviewerAction();
        })
      }
      className="press press-hover inline-flex h-12 items-center gap-2 rounded-none border-[1.5px] border-panel-fg bg-panel-fg px-7 text-base font-medium text-panel disabled:opacity-70"
    >
      {pending ? "Adding you…" : "I'll give an hour too"}
      <ArrowUpRight className="size-4 rtl:-scale-x-100" strokeWidth={2.5} />
    </button>
  );
}
