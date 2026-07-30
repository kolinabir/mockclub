import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isRenderablePhoto,
  isServablePhotoKey,
  photoKey,
  sniffImageType,
} from "@/server/profile/photo";

/**
 * Both functions here are security boundaries, not conveniences.
 *
 * `sniffImageType` decides the Content-Type the bytes are stored and served
 * under, and `isServablePhotoKey` is the entire guard between the photo route
 * and the rest of the bucket. Everything below is either an attack shape that
 * must keep failing or a real one that must keep working.
 */

const bytes = (...b: number[]) => new Uint8Array(b);

/** Real signatures, padded to the 12 bytes the sniffer needs to see. */
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const WEBP = bytes(
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x00, 0x00, 0x00, 0x00, // file size, unread
  0x57, 0x45, 0x42, 0x50, // "WEBP"
);

describe("sniffImageType", () => {
  it("recognises the three formats we store", () => {
    assert.deepEqual(sniffImageType(JPEG), { mime: "image/jpeg", ext: "jpg" });
    assert.deepEqual(sniffImageType(PNG), { mime: "image/png", ext: "png" });
    assert.deepEqual(sniffImageType(WEBP), { mime: "image/webp", ext: "webp" });
  });

  it("rejects markup, whatever the upload claimed to be", () => {
    // The one that matters: served back as text/html this is stored XSS on a
    // page every member visits. The client-supplied File.type is never trusted.
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    assert.equal(sniffImageType(html), null);
  });

  it("rejects a RIFF container that isn't WebP", () => {
    // "RIFF....WAVE" — right container, wrong payload.
    const wav = bytes(
      0x52, 0x49, 0x46, 0x46,
      0x00, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45,
    );
    assert.equal(sniffImageType(wav), null);
  });

  it("rejects anything too short to carry a signature", () => {
    assert.equal(sniffImageType(bytes()), null);
    assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff)), null);
  });

  it("rejects a GIF — decodable, but not on our list", () => {
    const gif = new TextEncoder().encode("GIF89a______");
    assert.equal(sniffImageType(gif), null);
  });
});

describe("photoKey", () => {
  const user = "65f1a2b3c4d5e6f7a8b9c0d1";

  it("is content-addressed, so different bytes are a different URL", () => {
    const a = photoKey(user, JPEG, "jpg");
    const b = photoKey(user, PNG, "png");
    assert.notEqual(a, b);
  });

  it("is stable, so re-uploading the same file overwrites in place", () => {
    assert.equal(photoKey(user, JPEG, "jpg"), photoKey(user, JPEG, "jpg"));
  });

  it("produces a key the photo route will actually serve", () => {
    // The two halves have to agree — a key we store but refuse to serve is a
    // broken image that no error anywhere would explain.
    assert.ok(isServablePhotoKey(photoKey(user, JPEG, "jpg")));
    assert.ok(isServablePhotoKey(photoKey(user, PNG, "png")));
    assert.ok(isServablePhotoKey(photoKey(user, WEBP, "webp")));
  });
});

describe("isServablePhotoKey", () => {
  it("accepts a well-formed key", () => {
    assert.ok(
      isServablePhotoKey("interviewer/65f1a2b3c4d5e6f7a8b9c0d1/0123456789abcdef.webp"),
    );
  });

  it("refuses to leave the interviewer prefix", () => {
    // Without the anchor these would read arbitrary objects out of the bucket.
    assert.equal(isServablePhotoKey("../secrets.txt"), false);
    assert.equal(
      isServablePhotoKey("interviewer/../../secrets/key.webp"),
      false,
    );
    assert.equal(
      isServablePhotoKey("products/65f1a2b3/0123456789abcdef.webp"),
      false,
    );
    assert.equal(
      isServablePhotoKey("xinterviewer/65f1a2b3/0123456789abcdef.webp"),
      false,
    );
  });

  it("refuses extensions we never store", () => {
    const base = "interviewer/65f1a2b3c4d5e6f7a8b9c0d1/0123456789abcdef";
    assert.equal(isServablePhotoKey(`${base}.svg`), false); // scriptable
    assert.equal(isServablePhotoKey(`${base}.html`), false);
    assert.equal(isServablePhotoKey(`${base}`), false);
  });

  it("refuses a malformed digest or user segment", () => {
    assert.equal(
      isServablePhotoKey("interviewer/65f1a2b3/ZZZZZZZZZZZZZZZZ.webp"),
      false,
    );
    assert.equal(
      isServablePhotoKey("interviewer/65f1a2b3/0123456789abcde.webp"),
      false, // 15 hex chars, not 16
    );
    assert.equal(
      isServablePhotoKey("interviewer//0123456789abcdef.webp"),
      false,
    );
    assert.equal(
      isServablePhotoKey("interviewer/a/b/0123456789abcdef.webp"),
      false,
    );
  });

  it("refuses a trailing newline smuggled past a line-anchored check", () => {
    // `$` in JS also matches before a trailing \n unless the regex is careful;
    // this is the case that catches a regression to /m or a lazy anchor.
    assert.equal(
      isServablePhotoKey(
        "interviewer/65f1a2b3c4d5e6f7a8b9c0d1/0123456789abcdef.webp\n",
      ),
      false,
    );
  });
});

describe("isRenderablePhoto", () => {
  /**
   * The narrow rule that keeps the card download and the share image alive.
   * Both are drawn by a PNG renderer that decodes JPEG and PNG and NOTHING
   * else — a stored WebP served fine through the proxy and then took both
   * routes down the first time a member with a photo asked for one.
   */
  it("accepts what the PNG renderer can decode", () => {
    assert.equal(isRenderablePhoto("image/jpeg"), true);
    assert.equal(isRenderablePhoto("image/png"), true);
  });

  it("rejects WebP, however well the browser handles it", () => {
    assert.equal(isRenderablePhoto("image/webp"), false);
  });

  it("ignores charset parameters and casing on the stored type", () => {
    assert.equal(isRenderablePhoto("IMAGE/JPEG"), true);
    assert.equal(isRenderablePhoto("image/png; charset=binary"), true);
    assert.equal(isRenderablePhoto(" image/jpeg "), true);
  });

  it("rejects anything else", () => {
    for (const t of ["image/svg+xml", "text/html", "application/octet-stream", ""]) {
      assert.equal(isRenderablePhoto(t), false, t);
    }
  });
});
