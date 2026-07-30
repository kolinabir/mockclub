import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  handleCandidates,
  MAX_HANDLE,
  normalizeHandle,
} from "@/server/profile/handle";

/**
 * A handle is a PUBLIC URL and it is unique, so both halves matter: what a
 * member is allowed to type, and what the generator hands someone who never
 * typed anything. The generator's output must always satisfy the validator —
 * the last test here is the one that keeps those two from drifting apart.
 */

const ok = (v: unknown): string => {
  const r = normalizeHandle(v);
  assert.equal(r.ok, true, `expected ok for ${JSON.stringify(v)}`);
  return r.ok ? r.value : "";
};

const rejected = (v: unknown) => {
  const r = normalizeHandle(v);
  assert.equal(r.ok, false, `expected rejection for ${JSON.stringify(v)}`);
};

describe("normalizeHandle", () => {
  it("accepts the ordinary shapes", () => {
    assert.equal(ok("abirkolin"), "abirkolin");
    assert.equal(ok("abir-kolin"), "abir-kolin");
    assert.equal(ok("abir2"), "abir2");
  });

  it("lowercases and trims", () => {
    assert.equal(ok("  AbirKolin  "), "abirkolin");
  });

  it("rejects anything that isn't a letter, number or hyphen", () => {
    rejected("abir kolin");
    rejected("abir_kolin");
    rejected("abir.kolin");
    rejected("abir/kolin");
    rejected("abir@kolin");
    rejected("আবির");
  });

  it("rejects leading and trailing hyphens", () => {
    rejected("-abir");
    rejected("abir-");
  });

  it("rejects doubled hyphens", () => {
    rejected("abir--kolin");
  });

  it("enforces the length bounds", () => {
    rejected("ab");
    assert.equal(ok("abc"), "abc");
    assert.equal(ok("a".repeat(MAX_HANDLE)).length, MAX_HANDLE);
    rejected("a".repeat(MAX_HANDLE + 1));
  });

  it("rejects words we may want as sibling routes", () => {
    // Once someone owns /interviewers/search, shipping a search page means
    // taking their URL away.
    rejected("search");
    rejected("new");
    rejected("admin");
    rejected("settings");
  });

  it("rejects anything shaped like an ObjectId", () => {
    // The route still resolves raw ids so old links survive, so a handle of
    // this shape would shadow a real member's page.
    rejected("6a61087196b53eb77dbe7920");
    // A 24-char string that ISN'T hex is fine — the ambiguity is the point.
    assert.equal(ok("zzzzzzzzzzzzzzzzzzzzzzzz"), "zzzzzzzzzzzzzzzzzzzzzzzz");
  });

  it("rejects empty, blank and non-strings", () => {
    rejected("");
    rejected("   ");
    rejected(undefined);
    rejected(null);
    rejected(7);
  });
});

describe("handleCandidates", () => {
  it("puts the name first", () => {
    assert.equal(handleCandidates("Abir Kolin", "93715")[0], "abirkolin");
  });

  it("offers numbered alternatives before falling back", () => {
    const list = handleCandidates("Abir Kolin", "93715");
    assert.equal(list[1], "abirkolin2");
    assert.ok(list.includes("interviewer-93715"));
  });

  it("keeps the letter when an accent is stripped", () => {
    assert.equal(handleCandidates("José García", "00001")[0], "josegarcia");
  });

  it("falls back to the card number for a non-Latin name", () => {
    // A Bengali or Arabic name is not less of a name — it just cannot be a
    // URL, and a mangled transliteration would be worse than a number.
    assert.deepEqual(handleCandidates("আবির কলিন", "93715"), [
      "interviewer-93715",
    ]);
    assert.deepEqual(handleCandidates("李雷", "00042"), ["interviewer-00042"]);
  });

  it("falls back when the name is too short to be a handle", () => {
    assert.deepEqual(handleCandidates("Li", "00007"), ["interviewer-00007"]);
  });

  it("never proposes a handle the validator would reject", () => {
    const names = [
      "Abir Kolin",
      "Search",
      "New",
      "José García",
      "আবির কলিন",
      "A".repeat(80),
      "Anne-Marie O'Neill",
      "!!!",
      "李雷",
      "Li",
    ];
    for (const name of names) {
      for (const candidate of handleCandidates(name, "93715")) {
        assert.equal(
          normalizeHandle(candidate).ok,
          true,
          `generator produced an invalid handle for ${name}: ${candidate}`,
        );
      }
    }
  });

  it("always offers at least one option", () => {
    for (const name of ["", "!!!", "李雷", "Search"]) {
      assert.ok(handleCandidates(name, "93715").length > 0, name);
    }
  });
});
