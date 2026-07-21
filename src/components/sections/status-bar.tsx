export function StatusBar() {
  return (
    <div className="border-b border-ink/15 bg-ink text-paper">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-2 sm:px-8">
        <span className="relative flex size-1.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-vermilion opacity-70 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-vermilion" />
        </span>
        <p className="stamp-label truncate text-paper/85">
          <span className="sm:hidden">Phase 01 — Gathering interviewers</span>
          <span className="hidden sm:inline">
            Phase 01 — Gathering interviewers · Booking opens when the calendar
            is full enough
          </span>
        </p>
      </div>
    </div>
  );
}
