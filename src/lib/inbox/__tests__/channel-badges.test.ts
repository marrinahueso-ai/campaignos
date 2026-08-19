import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("inbox channel badges match Meta marks", () => {
  const src = readSrc("../../../components/inbox/InboxPlatformIcon.tsx");

  it("uses outline comment bubbles, not a filled shared SpeechBubble", () => {
    assert.doesNotMatch(src, /function SpeechBubble/);
    assert.match(src, /function FacebookCommentBadge/);
    assert.match(src, /function InstagramCommentBadge/);
    const facebook = src.slice(
      src.indexOf("function FacebookCommentBadge"),
      src.indexOf("function FacebookTagBadge"),
    );
    const instagram = src.slice(
      src.indexOf("function InstagramCommentBadge"),
      src.indexOf("function InstagramTagBadge"),
    );
    assert.match(facebook, /<rect[\s\S]*fill="none"[\s\S]*stroke="#fff"/);
    assert.match(instagram, /<circle[\s\S]*fill="none"[\s\S]*stroke="#fff"/);
  });

  it("keeps the Instagram camera inset instead of full-bleed", () => {
    const camera = src.slice(
      src.indexOf("function InstagramCameraBadge"),
      src.indexOf("function InstagramCommentBadge"),
    );
    assert.match(camera, /x="6\.35"/);
    assert.doesNotMatch(camera, /x="2\.6"/);
  });
});
