"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import {
  saveAvailabilityAction,
  saveSettingsAction,
} from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Rule = { days: number[]; startTime: string; endTime: string };

export function AvailabilityForm({
  initialRules,
  timeZone,
  initialMax,
  initialPaused,
}: {
  initialRules: Rule[];
  timeZone: string;
  initialMax: number;
  initialPaused: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [rules, setRules] = useState<Rule[]>(
    initialRules.length
      ? initialRules
      : [{ days: [2, 4], startTime: "18:00", endTime: "20:00" }],
  );
  const [max, setMax] = useState(initialMax);
  const [paused, setPaused] = useState(initialPaused);

  const update = (i: number, patch: Partial<Rule>) =>
    setRules((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const toggleDay = (i: number, d: number) =>
    update(i, {
      days: rules[i].days.includes(d)
        ? rules[i].days.filter((x) => x !== d)
        : [...rules[i].days, d].sort(),
    });

  function save() {
    start(async () => {
      const a = await saveAvailabilityAction(
        (() => {
          const f = new FormData();
          f.set("rules", JSON.stringify(rules));
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

      <div className="space-y-4">
        {rules.map((rule, i) => (
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
                  className="mt-1.5 h-11 rounded-none border-[1.5px] border-ink bg-paper px-3"
                />
              </label>
              <label className="text-sm">
                <span className="stamp-label block text-ink-soft">To</span>
                <input
                  type="time"
                  value={rule.endTime}
                  onChange={(e) => update(i, { endTime: e.target.value })}
                  className="mt-1.5 h-11 rounded-none border-[1.5px] border-ink bg-paper px-3"
                />
              </label>
              {rules.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRules((r) => r.filter((_, j) => j !== i))}
                  aria-label="Remove these hours"
                  className="inline-flex size-11 items-center justify-center border-[1.5px] border-ink/25 text-ink-soft transition-colors hover:border-vermilion-deep hover:text-vermilion-deep"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRules((r) => [
            ...r,
            { days: [], startTime: "18:00", endTime: "20:00" },
          ])
        }
        className="inline-flex min-h-11 items-center gap-2 border-[1.5px] border-ink/25 px-4 text-sm font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
      >
        <Plus className="size-4" /> Add another block
      </button>

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
