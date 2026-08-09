import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveAiInstructionsFromNote,
  checklistFromTags,
  encodeRevisionNotes,
  parseRevisionNotes,
} from "@/lib/approvals-revision/revision-notes";
import {
  artworkFromSnapshot,
  mergeRevisionResubmitFields,
  snapshotFromSchedulingRow,
} from "@/lib/approvals-revision/sync-revision-snapshot";

describe("revision notes encode/decode", () => {
  it("round-trips tags and comment", () => {
    const encoded = encodeRevisionNotes("Warm up the headline", [
      "Artwork",
      "Date",
    ]);
    const parsed = parseRevisionNotes(encoded);
    assert.deepEqual(parsed.tags, ["Artwork", "Date"]);
    assert.equal(parsed.comment, "Warm up the headline");
  });

  it("treats plain notes as comment-only", () => {
    const parsed = parseRevisionNotes("Just a note");
    assert.deepEqual(parsed.tags, []);
    assert.equal(parsed.comment, "Just a note");
  });

  it("builds checklist from tags with defaults when empty", () => {
    const fromTags = checklistFromTags(["Caption"], null);
    assert.equal(fromTags.length, 1);
    assert.equal(fromTags[0]?.tag, "Caption");

    const defaults = checklistFromTags([], "Aug 12");
    assert.equal(defaults.length, 3);
    assert.equal(defaults[1]?.detail, "Aug 12");
  });
});

describe("deriveAiInstructionsFromNote", () => {
  it("turns approver questions into framed revision instructions", () => {
    const out = deriveAiInstructionsFromNote(
      "Can we warm up the headline and move the date to Aug 12? Logo feels small.",
    );
    assert.match(out, /^Revision direction \(interpret intent; do not paste into the caption\):/i);
    assert.match(out, /Warm up the headline/i);
    assert.match(out, /\.$/);
    assert.doesNotMatch(out, /\?/);
  });

  it("returns a default when note is empty", () => {
    assert.match(
      deriveAiInstructionsFromNote("   "),
      /approver's requested changes/i,
    );
    assert.match(
      deriveAiInstructionsFromNote("   "),
      /do not paste their note into the caption/i,
    );
  });

  it("does not double-prefix already framed instructions", () => {
    const framed =
      "Revision direction (interpret intent; do not paste into the caption): Make it warmer.";
    assert.equal(deriveAiInstructionsFromNote(framed), framed);
  });

  it("uses flyer checklist defaults when empty tags", () => {
    const defaults = checklistFromTags([], null, { isFlyer: true });
    assert.deepEqual(
      defaults.map((row) => row.tag),
      ["Artwork", "Date", "Copy"],
    );
    assert.match(defaults[1]?.detail ?? "", /event date/i);
  });
});

describe("mergeRevisionResubmitFields", () => {
  it("prefers client overrides over scheduling row snapshot", () => {
    const row = snapshotFromSchedulingRow({
      feed_artwork_url: "https://old/feed.png",
      story_artwork_url: null,
      caption_text: "Old caption",
      story_caption: null,
      schedule_at: "2026-08-05T14:00:00.000Z",
    });

    const merged = mergeRevisionResubmitFields(row, {
      feedArtworkUrl: "https://new/feed.png",
      captionText: "New caption",
    });

    assert.equal(merged.feedArtworkUrl, "https://new/feed.png");
    assert.equal(merged.captionText, "New caption");
    assert.equal(merged.scheduleAt, row.scheduleAt);
  });
});

describe("artworkFromSnapshot per-view patch", () => {
  it("keeps the other format when only feed or story is updated", () => {
    const existing = {
      feedUrl: "https://old/feed.png",
      storyUrl: "https://old/story.png",
    };

    const feedOnly = artworkFromSnapshot(existing, {
      feedArtworkUrl: "https://new/feed.png",
      storyArtworkUrl: null,
    });
    assert.equal(feedOnly.feedUrl, "https://new/feed.png");
    assert.equal(feedOnly.storyUrl, "https://old/story.png");

    const storyOnly = artworkFromSnapshot(existing, {
      feedArtworkUrl: null,
      storyArtworkUrl: "https://new/story.png",
    });
    assert.equal(storyOnly.feedUrl, "https://old/feed.png");
    assert.equal(storyOnly.storyUrl, "https://new/story.png");
  });

  it("includes Stories in checklist for story-specific notes", () => {
    const rows = checklistFromTags(["Artwork", "Stories"], null);
    assert.equal(rows.length, 2);
    assert.equal(rows[1]?.tag, "Stories");
    assert.match(rows[1]?.detail ?? "", /9:16/);
  });

  it("encodes flyer QR and Layout tags", () => {
    const encoded = encodeRevisionNotes("Move the QR lower", ["QR", "Layout"]);
    const parsed = parseRevisionNotes(encoded);
    assert.deepEqual(parsed.tags, ["QR", "Layout"]);
    const rows = checklistFromTags(["QR", "Layout"], null);
    assert.match(rows[0]?.detail ?? "", /QR/i);
    assert.match(rows[1]?.detail ?? "", /Spacing|layout|print/i);
  });
});
