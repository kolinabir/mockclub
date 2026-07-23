import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateJobTarget } from "@/server/profile/profile";

/**
 * "The job you're aiming at" takes a link OR a job title.
 *
 * The field asks for a job, so people type a job — "Marketing" was rejected as
 * an invalid URL and blocked Finish on an optional field. Every case here is a
 * real thing someone typed, or the shape that has to keep failing.
 */
describe("validateJobTarget", () => {
  const value = (v: unknown) => {
    const r = validateJobTarget(v);
    assert.ok(r.ok, `expected ok, got: ${r.ok ? "" : r.error}`);
    return r.value;
  };

  it("keeps a plain job title as text", () => {
    assert.deepEqual(value("Marketing"), { jobTarget: "Marketing" });
    assert.deepEqual(value("Senior PM at Acme"), {
      jobTarget: "Senior PM at Acme",
    });
    assert.deepEqual(value("  Data   Analyst "), { jobTarget: "Data Analyst" });
  });

  it("normalises a link into jobUrl", () => {
    assert.deepEqual(value("https://careers.example.com/123"), {
      jobUrl: "https://careers.example.com/123",
    });
    // Typed without a scheme, as people do.
    assert.deepEqual(value("careers.example.com/123"), {
      jobUrl: "https://careers.example.com/123",
    });
    assert.deepEqual(value("www.example.com"), {
      jobUrl: "https://www.example.com/",
    });
  });

  it("treats empty as nothing — the field is optional", () => {
    assert.deepEqual(value(undefined), {});
    assert.deepEqual(value("   "), {});
  });

  it("rejects a non-http scheme rather than storing it as prose", () => {
    assert.equal(validateJobTarget("javascript:alert(1)").ok, false);
    assert.equal(validateJobTarget("data:text/html,<script>").ok, false);
  });

  it("caps free text, but not a long posting URL", () => {
    assert.equal(validateJobTarget("a".repeat(200)).ok, false);
    assert.deepEqual(
      value(`https://careers.example.com/${"a".repeat(150)}`),
      { jobUrl: `https://careers.example.com/${"a".repeat(150)}` },
    );
  });
});
