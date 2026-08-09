import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeNoteContent,
  formatNoteUpdatedLabel,
  noteAuthorInitials,
  noteDisplayTitle,
  splitNoteContent,
} from "../note-content.ts";

describe("event note content title/body encoding", () => {
  it("splits first line as title and remainder as body without duplicating", () => {
    assert.deepEqual(
      splitNoteContent("Confirm with Jeni’s\n\nVerify the fundraiser details."),
      {
        title: "Confirm with Jeni’s",
        body: "Verify the fundraiser details.",
      },
    );
  });

  it("composes title-only and title+body safely", () => {
    assert.equal(composeNoteContent("Title only", ""), "Title only");
    assert.equal(
      composeNoteContent("Title", "Body line"),
      "Title\n\nBody line",
    );
    assert.equal(composeNoteContent("", "Body only"), "Body only");
  });

  it("round-trips title and body", () => {
    const content = composeNoteContent("Homepage + newsletter", "Add reminder");
    assert.deepEqual(splitNoteContent(content), {
      title: "Homepage + newsletter",
      body: "Add reminder",
    });
  });

  it("formats display title and author initials", () => {
    assert.equal(noteDisplayTitle("Confirm with Jeni’s\nMore"), "Confirm with Jeni’s");
    assert.equal(noteAuthorInitials("Sarah Jenkins"), "SJ");
    assert.equal(noteAuthorInitials(null), "TE");
  });

  it("formats relative updated labels", () => {
    const now = Date.parse("2026-08-09T18:00:00.000Z");
    assert.equal(
      formatNoteUpdatedLabel("2026-08-09T16:00:00.000Z", now),
      "2 hours ago",
    );
    assert.equal(
      formatNoteUpdatedLabel("2026-08-08T18:00:00.000Z", now),
      "yesterday",
    );
  });
});
