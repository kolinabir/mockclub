import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  analyseRules,
  expandSlots,
  localDates,
  mergeWindows,
  isOnStep,
  sessionsIn,
  snapToStep,
  windowsForDate,
  type ExpandableRule,
} from "@/server/scheduling/expand";

/**
 * The scheduling domain, tested without a database.
 *
 * Run with `npm test`. Every case here is one that has produced, or would
 * produce, a wrong booking: overlapping slots, an override that doesn't
 * override, a local date skipped at a DST transition.
 */

const rule = (p: Partial<ExpandableRule>): ExpandableRule => ({
  days: [],
  startTime: "09:00",
  endTime: "17:00",
  date: null,
  blocked: false,
  ...p,
});

/** Wall-clock label in a zone — what a member would actually see. */
const local = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

describe("mergeWindows", () => {
  it("merges overlapping windows into one", () => {
    // Two rules that overlap used to carve four slots covering the same hours,
    // so two candidates could book 09:00 and 09:30 and collide. The unique
    // index cannot catch that: the slots are different documents.
    assert.deepEqual(
      mergeWindows([
        { startTime: "09:00", endTime: "11:00" },
        { startTime: "09:30", endTime: "11:30" },
      ]),
      [{ start: 540, end: 690 }],
    );
  });

  it("sorts before merging", () => {
    assert.deepEqual(
      mergeWindows([
        { startTime: "18:00", endTime: "20:00" },
        { startTime: "09:00", endTime: "10:00" },
      ]),
      [
        { start: 540, end: 600 },
        { start: 1080, end: 1200 },
      ],
    );
  });

  it("merges windows that merely touch", () => {
    assert.deepEqual(
      mergeWindows([
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "10:00", endTime: "11:00" },
      ]),
      [{ start: 540, end: 660 }],
    );
  });

  it("swallows a fully contained window", () => {
    assert.deepEqual(
      mergeWindows([
        { startTime: "09:00", endTime: "17:00" },
        { startTime: "11:00", endTime: "12:00" },
      ]),
      [{ start: 540, end: 1020 }],
    );
  });

  it("drops malformed, inverted and empty windows rather than throwing", () => {
    assert.deepEqual(
      mergeWindows([
        { startTime: "25:00", endTime: "26:00" },
        { startTime: "17:00", endTime: "09:00" },
        { startTime: "0900", endTime: "1000" },
        { startTime: "09:00", endTime: "09:00" },
      ]),
      [],
    );
  });
});

describe("windowsForDate", () => {
  const tuesday = rule({ days: [2], startTime: "18:00", endTime: "20:00" });

  it("applies a recurring rule on its weekday only", () => {
    assert.deepEqual(windowsForDate([tuesday], "2026-08-11", 2), [
      { start: 1080, end: 1200 },
    ]);
    assert.deepEqual(windowsForDate([tuesday], "2026-08-12", 3), []);
  });

  it("lets a dated override REPLACE the recurring rule, not add to it", () => {
    // Merging instead of replacing is the classic bug: a member sets different
    // hours for one day and is still bookable during the original ones.
    assert.deepEqual(
      windowsForDate(
        [
          tuesday,
          rule({ date: "2026-08-11", startTime: "09:00", endTime: "10:00" }),
        ],
        "2026-08-11",
        2,
      ),
      [{ start: 540, end: 600 }],
    );
  });

  it("closes the day for a blocked override", () => {
    assert.deepEqual(
      windowsForDate(
        [tuesday, rule({ date: "2026-08-11", blocked: true })],
        "2026-08-11",
        2,
      ),
      [],
    );
  });

  it("lets blocked win over an open override on the same date", () => {
    assert.deepEqual(
      windowsForDate(
        [
          rule({ date: "2026-08-11", startTime: "09:00", endTime: "10:00" }),
          rule({ date: "2026-08-11", blocked: true }),
        ],
        "2026-08-11",
        2,
      ),
      [],
    );
  });

  it("does not let an override leak onto other dates", () => {
    assert.deepEqual(
      windowsForDate(
        [tuesday, rule({ date: "2026-08-18", blocked: true })],
        "2026-08-11",
        2,
      ),
      [{ start: 1080, end: 1200 }],
    );
  });
});

describe("sessionsIn", () => {
  it("counts whole slots only", () => {
    assert.equal(sessionsIn("18:00", "20:00", 60), 2);
    assert.equal(sessionsIn("18:00", "19:30", 60), 1); // 30 min discarded
    assert.equal(sessionsIn("18:00", "18:30", 60), 0); // nothing bookable
    assert.equal(sessionsIn("20:00", "18:00", 60), 0); // inverted
    assert.equal(sessionsIn("nonsense", "18:00", 60), 0);
  });
});

describe("snapToStep", () => {
  it("snaps odd minutes to the nearest half hour", () => {
    assert.equal(snapToStep("20:09"), "20:00");
    assert.equal(snapToStep("11:10"), "11:00");
    assert.equal(snapToStep("11:15"), "11:30"); // exactly half, rounds up
    assert.equal(snapToStep("11:44"), "11:30");
    assert.equal(snapToStep("11:46"), "12:00");
  });

  it("leaves times already on the grid alone", () => {
    assert.equal(snapToStep("11:00"), "11:00");
    assert.equal(snapToStep("11:30"), "11:30");
    assert.equal(snapToStep("00:00"), "00:00");
  });

  it("never rounds up past the end of the day", () => {
    // 23:59 would snap to 24:00, which is not a time.
    assert.equal(snapToStep("23:59"), "23:30");
    assert.equal(snapToStep("23:45"), "23:30");
  });

  it("passes malformed input through untouched", () => {
    assert.equal(snapToStep("nonsense"), "nonsense");
  });

  it("agrees with isOnStep", () => {
    for (const t of ["20:09", "11:15", "11:00", "23:59", "00:30"])
      assert.equal(isOnStep(snapToStep(t)), true, `${t} should snap on-grid`);
    assert.equal(isOnStep("20:09"), false);
    assert.equal(isOnStep("11:30"), true);
  });
});

describe("analyseRules", () => {
  const kinds = (rules: ExpandableRule[]) =>
    analyseRules(rules, 60).map((i) => i.kind);

  it("flags a block whose hours are fully contained in another", () => {
    // The reported case: 18:00-20:00 and 18:00-19:00 on the same days. Not an
    // exact duplicate, so an equality check misses it — but expansion merges
    // them and the second box does nothing.
    const issues = analyseRules(
      [
        rule({ days: [1, 4], startTime: "18:00", endTime: "20:00" }),
        rule({ days: [1, 4], startTime: "18:00", endTime: "19:00" }),
      ],
      60,
    );
    assert.deepEqual(issues, [
      { kind: "overlap", index: 1, otherIndex: 0, days: [1, 4] },
    ]);
  });

  it("flags a partial overlap and names only the shared days", () => {
    assert.deepEqual(
      analyseRules(
        [
          rule({ days: [1, 2], startTime: "09:00", endTime: "11:00" }),
          rule({ days: [2, 3], startTime: "10:00", endTime: "12:00" }),
        ],
        60,
      ),
      [{ kind: "overlap", index: 1, otherIndex: 0, days: [2] }],
    );
  });

  it("accepts blocks that merely touch", () => {
    assert.deepEqual(
      kinds([
        rule({ days: [1], startTime: "18:00", endTime: "19:00" }),
        rule({ days: [1], startTime: "19:00", endTime: "20:00" }),
      ]),
      [],
    );
  });

  it("accepts the same hours on different days", () => {
    assert.deepEqual(
      kinds([
        rule({ days: [1], startTime: "18:00", endTime: "20:00" }),
        rule({ days: [4], startTime: "18:00", endTime: "20:00" }),
      ]),
      [],
    );
  });

  it("never reports a weekly rule as clashing with a date override", () => {
    // The override replaces that day outright, so it cannot conflict.
    assert.deepEqual(
      kinds([
        rule({ days: [1], startTime: "18:00", endTime: "20:00" }),
        rule({ date: "2026-07-27", startTime: "18:00", endTime: "19:00" }),
      ]),
      [],
    );
  });

  it("flags two overrides on one date", () => {
    assert.deepEqual(
      kinds([
        rule({ date: "2026-07-27", startTime: "18:00", endTime: "19:00" }),
        rule({ date: "2026-07-27", startTime: "20:00", endTime: "21:00" }),
      ]),
      ["duplicate-date"],
    );
  });

  it("flags odd minutes and suggests the grid", () => {
    // The reported case: 18:00-20:09 looked fine and quietly discarded 9 min.
    assert.deepEqual(
      analyseRules([rule({ days: [0, 4], startTime: "18:00", endTime: "20:09" })], 60),
      [
        {
          kind: "off-step",
          index: 0,
          suggestion: { start: "18:00", end: "20:00" },
        },
        { kind: "ragged", index: 0, wastedMinutes: 9 },
      ],
    );
  });

  it("accepts half hours", () => {
    assert.deepEqual(
      kinds([rule({ days: [1], startTime: "11:30", endTime: "12:30" })]),
      [],
    );
  });

  it("does not apply the grid to a blocked day's placeholder hours", () => {
    assert.deepEqual(
      kinds([
        rule({ date: "2026-07-27", blocked: true, startTime: "00:00", endTime: "23:59" }),
      ]),
      [],
    );
  });

  it("flags a window too short to hold one session", () => {
    assert.deepEqual(
      kinds([rule({ days: [1], startTime: "18:00", endTime: "18:30" })]),
      ["too-short"],
    );
  });

  it("flags trailing minutes that can never be booked", () => {
    assert.deepEqual(
      analyseRules([rule({ days: [1], startTime: "18:00", endTime: "19:30" })], 60),
      [{ kind: "ragged", index: 0, wastedMinutes: 30 }],
    );
  });

  it("flags a recurring block with no weekday chosen", () => {
    assert.deepEqual(
      kinds([rule({ days: [], startTime: "18:00", endTime: "20:00" })]),
      ["no-days"],
    );
  });

  it("flags an inverted block once, and doesn't also call it too short", () => {
    assert.deepEqual(
      kinds([rule({ days: [1], startTime: "20:00", endTime: "18:00" })]),
      ["inverted"],
    );
  });

  it("ignores the placeholder hours on a blocked day", () => {
    assert.deepEqual(
      kinds([
        rule({ days: [1], startTime: "18:00", endTime: "20:00" }),
        rule({ date: "2026-07-27", blocked: true, startTime: "00:00", endTime: "23:59" }),
      ]),
      [],
    );
  });

  it("says nothing about a clean set", () => {
    assert.deepEqual(
      kinds([
        rule({ days: [1, 4], startTime: "18:00", endTime: "20:00" }),
        rule({ days: [6], startTime: "09:00", endTime: "12:00" }),
        rule({ date: "2026-07-27", startTime: "18:00", endTime: "19:00" }),
      ]),
      [],
    );
  });
});

describe("localDates", () => {
  it("skips no local date across a spring-forward transition", () => {
    // Stepping 86_400_000ms per day drops 2026-03-29 entirely here, and that
    // day silently generates no slots at all.
    assert.deepEqual(
      localDates(new Date("2026-03-28T23:30:00Z"), "Europe/London", 4).map(
        (d) => d.isoDate,
      ),
      ["2026-03-28", "2026-03-29", "2026-03-30", "2026-03-31"],
    );
  });

  it("rolls over months and years", () => {
    assert.deepEqual(
      localDates(new Date("2026-12-30T12:00:00Z"), "UTC", 4).map(
        (d) => d.isoDate,
      ),
      ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"],
    );
  });

  it("starts from the LOCAL date, not the UTC one", () => {
    assert.deepEqual(
      localDates(new Date("2026-08-14T20:00:00Z"), "Asia/Dhaka", 1).map(
        (d) => d.isoDate,
      ),
      ["2026-08-15"],
    );
  });
});

describe("expandSlots", () => {
  const everyDay = [
    rule({ days: [0, 1, 2, 3, 4, 5, 6], startTime: "00:00", endTime: "06:00" }),
  ];

  it("emits 5 slots on a 23-hour day, and never the hour that doesn't exist", () => {
    const slots = expandSlots({
      rules: everyDay,
      timeZone: "Europe/London",
      from: new Date("2026-03-28T23:00:00Z"),
      horizonDays: 2,
      slotMinutes: 60,
    }).filter((s) => s.startsAt < new Date("2026-03-29T23:00:00Z"));

    assert.deepEqual(
      slots.map((s) => local(s.startsAt, "Europe/London")),
      [
        "Sun 29/03, 00:00",
        "Sun 29/03, 02:00",
        "Sun 29/03, 03:00",
        "Sun 29/03, 04:00",
        "Sun 29/03, 05:00",
      ],
    );
  });

  it("emits 7 slots on a 25-hour day, all distinct instants", () => {
    const slots = expandSlots({
      rules: everyDay,
      timeZone: "Europe/London",
      from: new Date("2026-10-24T20:00:00Z"),
      horizonDays: 2,
      slotMinutes: 60,
    }).filter((s) => s.startsAt < new Date("2026-10-25T06:00:00Z"));

    assert.equal(slots.length, 7);
    assert.equal(new Set(slots.map((s) => s.startsAt.getTime())).size, 7);
    // Two of them legitimately read "01:00" — the hour repeats. Distinct
    // instants, so no double-booking, but the booking UI has to disambiguate.
    assert.deepEqual(
      slots.filter((s) => local(s.startsAt, "Europe/London").endsWith("01:00"))
        .length,
      2,
    );
  });

  it("never emits overlapping slots from overlapping rules", () => {
    const slots = expandSlots({
      rules: [
        rule({ days: [6], startTime: "09:00", endTime: "11:00" }),
        rule({ days: [6], startTime: "09:30", endTime: "11:30" }),
      ],
      timeZone: "Asia/Dhaka",
      from: new Date("2026-08-14T00:00:00Z"),
      horizonDays: 2,
      slotMinutes: 60,
    });

    assert.deepEqual(
      slots.map((s) => local(s.startsAt, "Asia/Dhaka")),
      ["Sat 15/08, 09:00", "Sat 15/08, 10:00"],
    );
    assert.ok(
      slots.every((s, i) => i === 0 || slots[i - 1].endsAt <= s.startsAt),
      "slots must be disjoint",
    );
  });

  it("never materialises the past", () => {
    const slots = expandSlots({
      rules: [
        rule({
          days: [0, 1, 2, 3, 4, 5, 6],
          startTime: "00:00",
          endTime: "23:00",
        }),
      ],
      timeZone: "UTC",
      from: new Date("2026-08-14T12:30:00Z"),
      horizonDays: 1,
      slotMinutes: 60,
    });

    assert.equal(slots[0].startsAt.toISOString(), "2026-08-14T13:00:00.000Z");
  });

  it("yields nothing for a window shorter than one slot", () => {
    assert.deepEqual(
      expandSlots({
        rules: [rule({ days: [6], startTime: "09:00", endTime: "09:45" })],
        timeZone: "UTC",
        from: new Date("2026-08-14T00:00:00Z"),
        horizonDays: 2,
        slotMinutes: 60,
      }),
      [],
    );
  });

  it("stays disjoint in a zone whose DST shift is 30 minutes", () => {
    const slots = expandSlots({
      rules: everyDay,
      timeZone: "Australia/Lord_Howe",
      from: new Date("2026-10-03T00:00:00Z"),
      horizonDays: 3,
      slotMinutes: 60,
    });
    assert.ok(
      slots.every((s, i) => i === 0 || slots[i - 1].endsAt <= s.startsAt),
      "slots must be disjoint",
    );
  });
});
