import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_UPLOAD_EXTENSIONS,
  resolveSafeUploadContentType,
} from "@/lib/uploads/safe-content-type";

describe("resolveSafeUploadContentType", () => {
  it("derives content type from an allowed extension", () => {
    assert.equal(
      resolveSafeUploadContentType("logo.png", IMAGE_UPLOAD_EXTENSIONS),
      "image/png",
    );
    assert.equal(
      resolveSafeUploadContentType("photo.JPG", IMAGE_UPLOAD_EXTENSIONS),
      "image/jpeg",
    );
  });

  it("rejects a disallowed extension regardless of claimed type", () => {
    assert.equal(
      resolveSafeUploadContentType("evil.html", IMAGE_UPLOAD_EXTENSIONS),
      null,
    );
  });

  it("rejects SVG uploads (script-capable)", () => {
    assert.equal(
      resolveSafeUploadContentType("logo.svg", IMAGE_UPLOAD_EXTENSIONS),
      null,
    );
  });

  it("rejects a spoofed double extension that isn't actually allowed", () => {
    assert.equal(
      resolveSafeUploadContentType("asset.png.html", IMAGE_UPLOAD_EXTENSIONS),
      null,
    );
  });

  it("rejects a file with no extension", () => {
    assert.equal(
      resolveSafeUploadContentType("noextension", IMAGE_UPLOAD_EXTENSIONS),
      null,
    );
  });
});
