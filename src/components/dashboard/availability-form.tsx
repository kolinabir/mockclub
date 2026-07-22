"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";

import {
  saveAvailabilityAction,
  saveSettingsAction,
} from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";
import {
  SLOT_MINUTES,
  TIME_STEP_MINUTES,
  analyseRules,
  sessionsIn,
  snapToStep,
  type ExpandableRule,
  type RuleIssue,
} from "@/server/scheduling/expand";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** A repeating window: the same hours on the same weekdays, every week. */
export type WeeklyBlock = { days: number[]; startTime: string; endTime: string };

/**
 * One calendar date, handled differently from the weekly pattern.
 * `blocked` means "not available at all that day" — the off switch.
 */
export type DateOverride = {
  date: string;
  blocked: boolean;
  startTime: string;
  endTime: string;
};

const fieldClass =
  "mt-1.5 h-11 rounded-none border-[1.5px] border-ink bg-paper px-3";

/**
 * Props shared by every time field.
 *
 * `step` makes the native picker offer half hours only. It does NOT stop
 * someone typing 20:09 — browsers just mark the field invalid, and we never
 * submit a real form, so nothing would catch it. Hence the snap on blur, and
 * the server check behind that.
 */
const timeFieldProps = {
  type: "time" as const,
  step: TIME_STEP_MINUTES * 60,
  className: fieldClass,
};

const listDays = (days: number[]) =>
  days.map((d) => DAY_LABELS[d]).join(", ");

/**
 * Whether an issue stops the save.
 *
 * Everything except `ragged` does. A ragged window still produces bookable
 * sessions — it just wastes the tail — so it is a note, not a fault. Every
 * other issue means at least one box on screen is doing nothing, and letting
 * that save is how someone ends up believing they offered hours they didn't.
 */
const isBlocking = (issue: RuleIssue) => issue.kind !== "ragged";

/** One issue, in words. Returns null for issues rendered elsewhere. */
function describe(issue: RuleIssue): string | null {
  switch (issue.kind) {
    case "no-days":
      return "Pick at least one day, or this block does nothing.";
    case "inverted":
      return "The end time has to be after the start time.";
    case "too-short":
      return `Shorter than ${SLOT_MINUTES} minutes, so no session fits — nobody can book this.`;
    case "off-step":
      return `Use whole or half hours — ${issue.suggestion.start}–${issue.suggestion.end}, not odd minutes.`;
    case "ragged":
      return `The last ${issue.wastedMinutes} minutes don't fit a whole session and won't be bookable.`;
    case "overlap":
      return `Overlaps the block above on ${listDays(issue.days)}. Change the days or the hours so they don't cover the same time.`;
    case "duplicate-date":
      return "Another entry already covers this date. Remove one of them.";
    default:
      return null;
  }
}

/** "2026-08-14" -> "Fri 14 Aug 2026", in the reader's locale. */
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  // Rendered as a plain calendar date — constructed in UTC and read back in UTC
  // so no zone can shift it to the day before.
  return new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** The day after `iso`, so a second override doesn't land on a taken date. */
function nextDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/**
 * Warnings for one entry, plus what it actually yields.
 *
 * The session count is the honest answer to "did that do anything?" — a
 * 30-minute window and a duplicated block both look fine and both produce
 * nothing, and only a number makes that obvious.
 */
function Notes({
  issues,
  sessions,
  perDay,
}: {
  issues: RuleIssue[];
  sessions: number;
  perDay: number;
}) {
  const messages = issues
    .map((issue) => ({ text: describe(issue), blocking: isBlocking(issue) }))
    .filter((m): m is { text: string; blocking: boolean } => m.text !== null);

  if (messages.length === 0 && (sessions === 0 || perDay === 0)) return null;

  return (
    <div className="mt-3 space-y-1.5">
      {messages.map((m, i) => (
        <p
          key={i}
          role="status"
          className={cn(
            "text-sm",
            // Severity is per message: a wasted-minutes note sitting under a
            // real error shouldn't be dressed up as one.
            m.blocking
              ? "font-medium text-vermilion-deep"
              : "text-ink-soft",
          )}
        >
          {m.text}
        </p>
      ))}
      {sessions > 0 && perDay > 0 && (
        <p className="text-sm text-ink-soft">
          {perDay === 1
            ? `${sessions} bookable ${sessions === 1 ? "session" : "sessions"}.`
            : `${sessions} bookable ${sessions === 1 ? "session" : "sessions"} on each of ${perDay} days.`}
        </p>
      )}
    </div>
  );
}

export function AvailabilityForm({
  initialBlocks,
  initialOverrides,
  timeZone,
  today,
  initialPaused,
}: {
  initialBlocks: WeeklyBlock[];
  initialOverrides: DateOverride[];
  timeZone: string;
  /** Today's date in the member's own zone — the floor for new overrides. */
  today: string;
  initialPaused: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [blocks, setBlocks] = useState<WeeklyBlock[]>(
    initialBlocks.length
      ? initialBlocks
      : [{ days: [2, 4], startTime: "18:00", endTime: "20:00" }],
  );
  const [overrides, setOverrides] = useState<DateOverride[]>(initialOverrides);
  const [paused, setPaused] = useState(initialPaused);

  const update = (i: number, patch: Partial<WeeklyBlock>) =>
    setBlocks((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const patchOverride = (i: number, patch: Partial<DateOverride>) =>
    setOverrides((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const toggleDay = (i: number, d: number) =>
    update(i, {
      days: blocks[i].days.includes(d)
        ? blocks[i].days.filter((x) => x !== d)
        : [...blocks[i].days, d].sort(),
    });

  /**
   * Exactly what gets sent, so the warnings below describe the real payload
   * rather than a parallel approximation of it.
   */
  const payload = useMemo<ExpandableRule[]>(
    () => [
      ...blocks.map((b) => ({
        days: b.days,
        startTime: b.startTime,
        endTime: b.endTime,
        date: null,
        blocked: false,
      })),
      ...overrides.map((o) => ({
        days: [],
        // A blocked day has no hours, but the rule still has to validate.
        startTime: o.blocked ? "00:00" : o.startTime,
        endTime: o.blocked ? "23:30" : o.endTime,
        date: o.date,
        blocked: o.blocked,
      })),
    ],
    [blocks, overrides],
  );

  /**
   * Warnings, keyed by position in `payload`. Blocks occupy 0..blocks.length-1
   * and overrides follow.
   *
   * The same function the tests use — expansion merges overlapping windows, so
   * a redundant block is harmless and therefore silent. This is what makes it
   * visible.
   */
  const issues = useMemo(
    () => analyseRules(payload, SLOT_MINUTES),
    [payload],
  );

  const blockingIssues = issues.filter(isBlocking);

  const issuesByIndex = useMemo(() => {
    const map = new Map<number, RuleIssue[]>();
    for (const issue of issues) {
      const list = map.get(issue.index) ?? [];
      list.push(issue);
      map.set(issue.index, list);
    }
    return map;
  }, [issues]);

  const issuesFor = (index: number) => issuesByIndex.get(index) ?? [];

  /** Weekly days this override supersedes — the thing people get wrong. */
  const replacedDays = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return [];
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return blocks.filter((b) => b.days.includes(weekday));
  };

  function addOverride() {
    const last = overrides[overrides.length - 1]?.date;
    setOverrides((r) => [
      ...r,
      {
        date: last && last >= today ? nextDay(last) : today,
        blocked: false,
        startTime: "18:00",
        endTime: "19:00",
      },
    ]);
  }

  function save() {
    // Refused here rather than saved and silently repaired by expansion.
    // Expansion merges overlaps and drops unusable windows without complaint,
    // which is right for rendering stored data and wrong for accepting new
    // data: it would report success for hours that don't exist.
    if (blockingIssues.length) {
      setMsg({
        ok: false,
        text: "Fix the highlighted hours first — some of them can't be booked.",
      });
      return;
    }

    start(async () => {
      // Both kinds go over the wire together: the server replaces the whole
      // rule set, so leaving overrides out of the payload would delete them.
      const a = await saveAvailabilityAction(
        (() => {
          const f = new FormData();
          f.set("rules", JSON.stringify(payload));
          // No zone here on purpose: it comes from the profile, server-side.
          // Rules are local wall-clock only.
          return f;
        })(),
      );
      if (!a.ok) {
        setMsg({ ok: false, text: a.error });
        return;
      }

      const s = await saveSettingsAction(
        (() => {
          const f = new FormData();
          if (paused) f.set("paused", "on");
          return f;
        })(),
      );
      setMsg(
        s.ok ? { ok: true, text: "Saved." } : { ok: false, text: s.error },
      );
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        These are <span className="font-medium text-ink">your local hours</span>{" "}
        in <span className="font-medium text-ink">{timeZone}</span>. We store
        the wall-clock time, not a fixed offset — so daylight-saving changes
        never shift your week.
      </p>

      <section>
        <h2 className="stamp-label text-ink-soft">Every week</h2>

        <div className="mt-3 space-y-4">
          {blocks.map((rule, i) => (
            <div key={i} className="press bg-card p-4 sm:p-5">
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((d, di) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(i, di)}
                    aria-pressed={rule.days.includes(di)}
                    className={cn(
                      "min-h-11 min-w-11 border-[1.5px] px-2 text-sm font-medium transition-all",
                      rule.days.includes(di)
                        ? "border-ink bg-ink text-paper"
                        : "border-ink/25 text-ink-soft hover:border-ink",
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="stamp-label block text-ink-soft">From</span>
                  <input
                    {...timeFieldProps}
                    value={rule.startTime}
                    onChange={(e) => update(i, { startTime: e.target.value })}
                    onBlur={(e) =>
                      update(i, { startTime: snapToStep(e.target.value) })
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="stamp-label block text-ink-soft">To</span>
                  <input
                    {...timeFieldProps}
                    value={rule.endTime}
                    onChange={(e) => update(i, { endTime: e.target.value })}
                    onBlur={(e) =>
                      update(i, { endTime: snapToStep(e.target.value) })
                    }
                  />
                </label>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setBlocks((r) => r.filter((_, j) => j !== i))
                    }
                    aria-label="Remove these hours"
                    className="inline-flex size-11 items-center justify-center border-[1.5px] border-ink/25 text-ink-soft transition-colors hover:border-vermilion-deep hover:text-vermilion-deep"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>

              <Notes
                issues={issuesFor(i)}
                sessions={sessionsIn(rule.startTime, rule.endTime, SLOT_MINUTES)}
                perDay={rule.days.length}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setBlocks((r) => [
              ...r,
              { days: [], startTime: "18:00", endTime: "20:00" },
            ])
          }
          className="mt-4 inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/25 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <Plus className="size-4" /> Add another block
        </button>
      </section>

      <section className="border-t border-ink/15 pt-6">
        <h2 className="stamp-label text-ink-soft">Specific dates</h2>
        <p className="mt-2 text-sm text-ink-soft">
          For one-offs: a single hour next month, or a day you can&apos;t make.
          A date here <span className="font-medium text-ink">replaces</span>{" "}
          your weekly hours for that day — it doesn&apos;t add to them.
        </p>

        {overrides.length > 0 && (
          <div className="mt-4 space-y-4">
            {overrides.map((o, i) => (
              <div key={i} className="press bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-sm">
                    <span className="stamp-label block text-ink-soft">
                      Date
                    </span>
                    <input
                      type="date"
                      value={o.date}
                      min={today}
                      onChange={(e) =>
                        patchOverride(i, { date: e.target.value })
                      }
                      className={fieldClass}
                    />
                  </label>

                  {!o.blocked && (
                    <>
                      <label className="text-sm">
                        <span className="stamp-label block text-ink-soft">
                          From
                        </span>
                        <input
                          {...timeFieldProps}
                          value={o.startTime}
                          onChange={(e) =>
                            patchOverride(i, { startTime: e.target.value })
                          }
                          onBlur={(e) =>
                            patchOverride(i, {
                              startTime: snapToStep(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="text-sm">
                        <span className="stamp-label block text-ink-soft">
                          To
                        </span>
                        <input
                          {...timeFieldProps}
                          value={o.endTime}
                          onChange={(e) =>
                            patchOverride(i, { endTime: e.target.value })
                          }
                          onBlur={(e) =>
                            patchOverride(i, {
                              endTime: snapToStep(e.target.value),
                            })
                          }
                        />
                      </label>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setOverrides((r) => r.filter((_, j) => j !== i))
                    }
                    aria-label={`Remove ${formatDate(o.date)}`}
                    className="inline-flex size-11 items-center justify-center border-[1.5px] border-ink/25 text-ink-soft transition-colors hover:border-vermilion-deep hover:text-vermilion-deep"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <label className="mt-4 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={o.blocked}
                    onChange={(e) =>
                      patchOverride(i, { blocked: e.target.checked })
                    }
                    className="size-5 accent-[var(--vermilion)]"
                  />
                  <span className="font-medium">
                    Unavailable all day on {formatDate(o.date)}
                  </span>
                </label>

                {!o.blocked && replacedDays(o.date).length > 0 && (
                  <p className="mt-3 text-sm text-ink-soft">
                    This replaces your usual{" "}
                    {replacedDays(o.date)
                      .map((b) => `${b.startTime}–${b.endTime}`)
                      .join(" and ")}{" "}
                    on that day.
                  </p>
                )}

                <Notes
                  issues={issuesFor(blocks.length + i)}
                  sessions={
                    o.blocked
                      ? 0
                      : sessionsIn(o.startTime, o.endTime, SLOT_MINUTES)
                  }
                  perDay={o.blocked ? 0 : 1}
                />
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addOverride}
          className="mt-4 inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/25 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <CalendarPlus className="size-4" /> Add a specific date
        </button>
      </section>

      <div className="border-t border-ink/15 pt-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
            className="size-5 accent-[var(--vermilion)]"
          />
          <span className="font-medium">Pause my availability</span>
        </label>
        <p className="mt-1 text-sm text-ink-soft">
          Nobody can book you while this is on. No explanation needed, any time.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={pending || blockingIssues.length > 0}
          className="press press-hover h-12 rounded-none bg-vermilion-strong px-7 text-base font-medium text-chalk disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save availability"}
        </button>
        {blockingIssues.length > 0 && !msg && (
          <p role="status" className="text-sm font-medium text-vermilion-deep">
            {blockingIssues.length === 1
              ? "Fix the highlighted entry to save."
              : `Fix the ${blockingIssues.length} highlighted entries to save.`}
          </p>
        )}
        {msg && (
          <p
            role="status"
            className={cn(
              "text-sm font-medium",
              msg.ok ? "text-olive" : "text-vermilion-deep",
            )}
          >
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}
