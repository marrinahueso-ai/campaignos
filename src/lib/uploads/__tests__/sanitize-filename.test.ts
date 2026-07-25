import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeFilenameForStorage } from "@/lib/uploads/sanitize-filename";

describe("sanitizeFilenameForStorage", () => {
  it("passes through an already-safe filename", () => {
    assert.equal(
      sanitizeFilenameForStorage("school-calendar_2026.pdf"),
      "school-calendar_2026.pdf",
    );
  });

  it("strips embedded path segments (traversal / nested folders)", () => {
    assert.equal(
      sanitizeFilenameForStorage("../../etc/passwd"),
      "passwd",
    );
    assert.equal(
      sanitizeFilenameForStorage("some/dir\\file.pdf"),
      "file.pdf",
    );
  });

  it("collapses whitespace and strips unsafe characters", () => {
    assert.equal(
      sanitizeFilenameForStorage("My Calendar (Final)!.pdf"),
      "My-Calendar-Final.pdf",
    );
  });

  it("collapses repeated leading dots so it can't hide as dotfile-style traversal", () => {
    const result = sanitizeFilenameForStorage("....hidden.ics");
    assert.equal(result.startsWith("."), false);
  });

  it("falls back to the default name when nothing safe remains", () => {
    assert.equal(sanitizeFilenameForStorage("???.."), "upload");
    assert.equal(
      sanitizeFilenameForStorage("???..", "calendar-subscribe.ics"),
      "calendar-subscribe.ics",
    );
  });

  it("truncates extremely long filenames", () => {
    const longName = `${"a".repeat(300)}.pdf`;
    const result = sanitizeFilenameForStorage(longName);
    assert.ok(result.length <= 150);
  });
});
