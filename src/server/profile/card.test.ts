import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCard, cardNumber, MAX_CARD_SKILLS } from "@/server/profile/card";
import type { ProfileDoc } from "@/server/profile/profile";

/**
 * The card is a GATE, not a decoration: `ready` decides whether a member's face
 * and workplace are rendered at all. So what is tested here is the gate — that
 * no single missing field lets it through, and that the number it stamps is the
 * same one tomorrow.
 */

const interviewer = { id: "user_abc", name: "Arafat AH", isInterviewer: true };

/** A profile with every card field present. Each test removes exactly one. */
const complete: ProfileDoc = {
  userId: "user_abc",
  trackSlug: "software-engineering",
  level: "mid",
  languages: ["বাংলা", "English"],
  links: [
    { type: "github", url: "https://github.com/x" },
    { type: "linkedin", url: "https://linkedin.com/in/x" },
  ],
  timeZone: "Asia/Dhaka",
  updatedAt: new Date(0),
  skills: ["Next.js", "React"],
  currentRole: { company: "Viralspot AI", role: "Frontend Engineer", current: true },
  photo: { key: "interviewer/user_abc/0123456789abcdef.webp", updatedAt: new Date(0) },
};

const without = (patch: Partial<ProfileDoc>): ProfileDoc => ({
  ...complete,
  ...patch,
});

describe("cardNumber", () => {
  it("is five digits, zero-padded", () => {
    for (const id of ["a", "user_abc", "x".repeat(40)]) {
      assert.match(cardNumber(id), /^\d{5}$/);
    }
  });

  it("is stable for the same user", () => {
    assert.equal(cardNumber("user_abc"), cardNumber("user_abc"));
  });

  it("differs between users", () => {
    assert.notEqual(cardNumber("user_abc"), cardNumber("user_abd"));
  });
});

describe("buildCard readiness", () => {
  it("is ready when every field is present", () => {
    const { ready, requirements } = buildCard(interviewer, complete);
    assert.equal(ready, true);
    assert.ok(requirements.every((r) => r.done));
  });

  it("is never ready for a candidate, however complete the profile", () => {
    const { ready, requirements } = buildCard(
      { ...interviewer, isInterviewer: false },
      complete,
    );
    assert.equal(ready, false);
    // Exactly one thing stands in their way, and it isn't a profile field.
    assert.deepEqual(
      requirements.filter((r) => !r.done).map((r) => r.key),
      ["interviewer"],
    );
  });

  it("is not ready with no profile at all", () => {
    assert.equal(buildCard(interviewer, null).ready, false);
  });

  const cases: [string, Partial<ProfileDoc>][] = [
    ["photo", { photo: undefined }],
    ["role", { currentRole: undefined }],
    ["track", { trackSlug: "" }],
    ["skills", { skills: [] }],
    ["languages", { languages: [] }],
    ["timeZone", { timeZone: "" }],
  ];

  for (const [key, patch] of cases) {
    it(`is blocked by a missing ${key}`, () => {
      const { ready, requirements } = buildCard(interviewer, without(patch));
      assert.equal(ready, false);
      assert.deepEqual(
        requirements.filter((r) => !r.done).map((r) => r.key),
        [key],
      );
    });
  }

  it("treats a half-filled current role as missing", () => {
    // A company with no job title prints "at Viralspot AI" under a blank line.
    const { ready } = buildCard(
      interviewer,
      without({ currentRole: { company: "Viralspot AI", role: "  ", current: true } }),
    );
    assert.equal(ready, false);
  });

  it('requires the typed name behind the "other" track', () => {
    const other = without({ trackSlug: "other", customTrack: undefined });
    assert.equal(buildCard(interviewer, other).ready, false);
    assert.equal(
      buildCard(interviewer, { ...other, customTrack: "Technical Writing" }).ready,
      true,
    );
  });
});

describe("buildCard data", () => {
  it("prints the profile's own values", () => {
    const { data } = buildCard(interviewer, complete);
    assert.equal(data.name, "Arafat AH");
    assert.equal(data.position, "Frontend Engineer");
    assert.equal(data.company, "Viralspot AI");
    assert.equal(data.track, "Software Engineering");
    assert.equal(data.timeZone, "Asia/Dhaka");
    assert.deepEqual(data.languages, ["বাংলা", "English"]);
    assert.equal(data.photoKey, complete.photo!.key);
  });

  it("uses the typed track name for the other track", () => {
    const { data } = buildCard(
      interviewer,
      without({ trackSlug: "other", customTrack: "Technical Writing" }),
    );
    assert.equal(data.track, "Technical Writing");
  });

  it("caps the stack so a 20-skill profile can't blow the layout", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Skill ${i}`);
    const { data } = buildCard(interviewer, without({ skills: many }));
    assert.equal(data.skills.length, MAX_CARD_SKILLS);
  });

  it("falls back to a real zone so the locked preview still formats", () => {
    const { data } = buildCard(interviewer, without({ timeZone: "" }));
    assert.equal(data.timeZone, "UTC");
    assert.equal(data.photoKey !== null, true);
  });
});
