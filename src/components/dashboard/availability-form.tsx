"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarPlus, Plus, Trash2 } from "lucide-react";

import {
  saveAvailabilityAction,
  saveSettingsAction,
} from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

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

/** Identity of a weekly block, for spotting exact duplicates. */
const blockKey = (b: WeeklyBlock) =>
  `${[...b.days].sort().join(",")}|${b.startTime}|${b.endTime}`;

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

export function AvailabilityForm({
  initialBlocks,
  initialOverrides,
  timeZone,
  today,
  initialMax,
  initialPaused,
}: {
  initialBlocks: WeeklyBlock[];
  initialOverrides: DateOverride[];
  timeZone: string;
  /** Today's date in the member's own zone — the floor for new overrides. */
  today: string;
  initialMax: number;
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
  const [max, setMax] = useState(initialMax);
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
   * Indexes of blocks that repeat an earlier one exactly.
   *
   * The server merges overlapping windows before carving slots, so a duplicate
   * is harmless — and therefore invisible. Saying so beats letting someone add
   * the same hours three times and wonder why nothing changed.
   */
  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    blocks.forEach((b, i) => {
      if (b.days.length === 0) return;
      const key = blockKey(b);
      if (seen.has(key)) dupes.add(i);
      else seen.add(key);
    });
    return dupes;
  }, [blocks]);

  const clashingDates = useMemo(() => {
    const seen = new Set<string>();
    const dupes = new Set<number>();
    overrides.forEach((o, i) => {
      if (seen.has(o.date)) dupes.add(i);
      else seen.add(o.date);
    });
    return dupes;
  }, [overrides]);

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
    start(async () => {
      // Both kinds go over the wire together: the server replaces the whole
      // rule set, so leaving overrides out of the payload would delete them.
      const payload = [
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
          endTime: o.blocked ? "23:59" : o.endTime,
          date: o.date,
          blocked: o.blocked,
        })),
      ];

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
          f.set("maxSessionsPerMonth", String(max));
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
                    type="time"
                    value={rule.startTime}
                    onChange={(e) => update(i, { startTime: e.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="text-sm">
                  <span className="stamp-label block text-ink-soft">To</span>
                  <input
                    type="time"
                    value={rule.endTime}
                    onChange={(e) => update(i, { endTime: e.target.value })}
                    className={fieldClass}
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

              {duplicates.has(i) && (
                <p role="status" className="mt-3 text-sm text-vermilion-deep">
                  Same days and hours as a block above — this one adds nothing.
                  Change it or remove it.
                </p>
              )}
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
                          type="time"
                          value={o.startTime}
                          onChange={(e) =>
                            patchOverride(i, { startTime: e.target.value })
                          }
                          className={fieldClass}
                        />
                      </label>
                      <label className="text-sm">
                        <span className="stamp-label block text-ink-soft">
                          To
                        </span>
                        <input
                          type="time"
                          value={o.endTime}
                          onChange={(e) =>
                            patchOverride(i, { endTime: e.target.value })
                          }
                          className={fieldClass}
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

                {clashingDates.has(i) && (
                  <p role="status" className="mt-3 text-sm text-vermilion-deep">
                    Another entry already covers this date. Only one of them
                    will count.
                  </p>
                )}
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
        <label className="block">
          <span className="stamp-label text-ink-soft">
            Max sessions per month
          </span>
          <input
            type="number"
            min={1}
            max={30}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="mt-2 h-12 w-28 rounded-none border-[1.5px] border-ink bg-paper px-3 text-base"
          />
        </label>
        <p className="mt-2 text-sm text-ink-soft">
          Your cap. One a month is genuinely useful — we would rather you stay
          than burn out.
        </p>

        <label className="mt-5 flex items-center gap-3">
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
          disabled={pending}
          className="press press-hover h-12 rounded-none bg-vermilion-strong px-7 text-base font-medium text-chalk disabled:opacity-70"
        >
          {pending ? "Saving…" : "Save availability"}
        </button>
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
