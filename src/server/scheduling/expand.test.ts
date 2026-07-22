import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  expandSlots,
  localDates,
  mergeWindows,
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
