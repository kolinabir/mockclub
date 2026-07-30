import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCard,
  cardNumber,
  LANGS_MAX_CHARS,
  languagesLine,
  MAX_CARD_SKILLS,
  STACK_MAX_CHARS,
  stackLine,
} from "@/server/profile/card";
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

describe("languagesLine", () => {
  it("leaves a short list alone", () => {
    assert.equal(languagesLine(["English", "বাংলা"]), "English + বাংলা");
  });

  it("bounds a long list and counts the rest — whole languages only", () => {
    const langs = [
      "English",
      "Português",
      "العربية",
      "Français",
      "Español",
      "বাংলা",
      "中文",
    ];
    const line = languagesLine(langs);

    assert.ok(line.length <= LANGS_MAX_CHARS, line);
    assert.match(line, /\+\d+$/);

    // Everything shown is an UNCUT language from the front of the list.
    const shown = line.replace(/ \+\d+$/, "").split(" + ");
    assert.deepEqual(shown, langs.slice(0, shown.length));

    // The count covers exactly what was dropped.
    const counted = Number(line.match(/\+(\d+)$/)?.[1]);
    assert.equal(shown.length + counted, langs.length);
  });

  it("never drops below one visible language", () => {
    const line = languagesLine(["A".repeat(LANGS_MAX_CHARS + 5), "English"]);
    assert.ok(line.startsWith("A"), line);
    assert.ok(line.endsWith("+1"), line);
  });
});

describe("stackLine", () => {
  it("leaves a short stack alone", () => {
    assert.equal(stackLine(["Nextjs", "Gsap"]), "Nextjs, Gsap");
  });

  it("bounds a long one and marks the cut", () => {
    const line = stackLine([
      "Data structures & algorithms",
      "System design",
      "Behavioural interviews",
      "Testing strategy",
    ]);
    assert.ok(line.length <= STACK_MAX_CHARS + 1, line);
    assert.ok(line.endsWith("…"), line);
  });

  it("cuts on a word boundary, never mid-word", () => {
    const skills = ["Kubernetes orchestration and service meshes"];
    const kept = stackLine(skills).replace(/…$/, "");
    const full = skills.join(", ");

    // What survives is a prefix of the input...
    assert.ok(full.startsWith(kept), kept);
    // ...and it stops where a word does, rather than inside one.
    assert.ok(/^\s|^$/.test(full.slice(kept.length)), kept);
  });

  it("never leaves a dangling comma before the ellipsis", () => {
    const line = stackLine(["JavaScript", "TypeScript", "React", "Next.js"]);
    assert.ok(!line.includes(",…"), line);
  });

  it("only ever removes from the end", () => {
    // The card and the PNG both call this, so whatever it returns is what a
    // member sees on screen AND in the file they download. It must never
    // reorder or reword — only stop early.
    for (const skills of [
      ["Nextjs", "Gsap"],
      ["JavaScript", "TypeScript", "React", "Next.js"],
      ["Data structures & algorithms", "System design", "Testing strategy"],
      ["A".repeat(80)],
    ]) {
      const full = skills.join(", ");
      const line = stackLine(skills);
      assert.ok(full.startsWith(line.replace(/…$/, "")), line);
      assert.ok(line.length <= STACK_MAX_CHARS + 1, line);
    }
  });
});
