import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirror of clampBriefToMaxSentences — keep in sync with event-brief-prompt.ts */
function clampBriefToMaxSentences(text: string, maxSentences = 3): string {
  const trimmed = text.trim();
  if (!trimmed || maxSentences < 1) {
    return trimmed;
  }

  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts || parts.length <= maxSentences) {
    return trimmed;
  }

  return parts
    .slice(0, maxSentences)
    .map((part) => part.trim())
    .join(" ")
    .trim();
}

describe("event brief length", () => {
  it("clampBriefToMaxSentences keeps at most three sentences", () => {
    const long =
      "One. Two. Three. Four is too many. Five should be gone.";
    assert.equal(clampBriefToMaxSentences(long), "One. Two. Three.");
  });

  it("clampBriefToMaxSentences leaves short briefs alone", () => {
    const short =
      "Fall carnival raises funds and brings families together. Emphasize fun and school spirit.";
    assert.equal(clampBriefToMaxSentences(short), short);
  });
});
