import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MAX_NAME_LENGTH, normalizeDisplayName } from "@/server/users/users";

/**
 * The display name is the one field a member types that other members READ — on
 * a card, and in a session invite. So what matters here is what a name is
 * allowed to CONTAIN, not whether it gets trimmed.
 *
 * The invisible characters are written as escapes on purpose: a literal
 * U+202E in this file would be invisible in every diff and code review it ever
 * passes through, which is the same property that makes it worth stripping.
 */

const ZWSP = "\u200B"; // zero-width space
const BOM = "\uFEFF"; // zero-width no-break space
const RLO = "\u202E"; // right-to-left override
const LRE = "\u202A"; // left-to-right embedding
const PDF = "\u202C"; // pop directional formatting
const LRI = "\u2066"; // left-to-right isolate
const PDI = "\u2069"; // pop directional isolate

const ok = (v: unknown): string => {
  const r = normalizeDisplayName(v);
  assert.equal(r.ok, true, `expected ok for ${JSON.stringify(v)}`);
  return r.ok ? r.value : "";
};

const rejected = (v: unknown) => {
  const r = normalizeDisplayName(v);
  assert.equal(r.ok, false, `expected rejection for ${JSON.stringify(v)}`);
};

describe("normalizeDisplayName", () => {
  it("keeps an ordinary name unchanged", () => {
    assert.equal(ok("Arafat AH"), "Arafat AH");
  });

  it("keeps names outside the Latin alphabet", () => {
    assert.equal(ok("আরাফাত"), "আরাফাত");
    assert.equal(ok("محمد صلاح"), "محمد صلاح");
    assert.equal(ok("李雷"), "李雷");
  });

  it("keeps the punctuation real names contain", () => {
    assert.equal(ok("Anne-Marie O'Neill"), "Anne-Marie O'Neill");
    assert.equal(ok("Ada Lovelace, Jr."), "Ada Lovelace, Jr.");
  });

  it("collapses padding rather than rejecting it", () => {
    assert.equal(ok("  Arafat   AH \n"), "Arafat AH");
  });

  it("strips zero-width padding used to fake a distinct name", () => {
    // Two accounts that render identically is the point of the attack.
    assert.equal(ok(`Ara${ZWSP}fat AH`), "Arafat AH");
    assert.equal(ok(`Arafat${BOM} AH`), "Arafat AH");
  });

  it("strips bidi controls, which reorder the text drawn AFTER them", () => {
    // RTL is enabled site-wide, so an unbalanced override escapes the name and
    // rewrites the rest of the card.
    assert.equal(ok(`Arafat${RLO} AH`), "Arafat AH");
    assert.equal(ok(`${LRE}Arafat AH${PDF}`), "Arafat AH");
    assert.equal(ok(`${LRI}Arafat${PDI} AH`), "Arafat AH");
  });

  it("strips control characters", () => {
    // BEL and friends are not whitespace, so nothing else would remove them.
    assert.equal(ok(`Arafat${"\u0007"}${"\u001B"} AH`), "Arafat AH");
    assert.equal(ok(`Arafat${"\u0000"} AH`), "Arafat AH");
  });

  it("rejects a name that is only invisible characters", () => {
    rejected(ZWSP.repeat(3));
    rejected(RLO + RLO);
  });

  it("rejects punctuation with no letters or digits in it", () => {
    rejected("---");
    rejected("...");
    rejected("!!");
  });

  it("rejects empty, blank and non-strings", () => {
    rejected("");
    rejected("   ");
    rejected(undefined);
    rejected(null);
    rejected(42);
    rejected(["Arafat"]);
  });

  it("rejects a single character but accepts two", () => {
    rejected("A");
    assert.equal(ok("Li"), "Li");
  });

  it("measures length AFTER stripping, so padding can't buy room", () => {
    const long = "a".repeat(MAX_NAME_LENGTH + 1);
    rejected(long);
    // The same overlong name padded with zero-widths is still overlong.
    rejected(long.split("").join(ZWSP));
    assert.equal(ok("a".repeat(MAX_NAME_LENGTH)).length, MAX_NAME_LENGTH);
  });
});
