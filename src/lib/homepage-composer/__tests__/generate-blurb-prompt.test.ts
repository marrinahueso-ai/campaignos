import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMEPAGE_BLURB_MAX_SENTENCES,
  buildHomepageBlurbUserPrompt,
  clampBlurbToMaxSentences,
  normalizeHomepageBlurbText,
} from "@/lib/homepage-composer/generate-blurb-prompt";

describe("homepage composer blurb prompts", () => {
  it("normalizes fences and labels", () => {
    assert.equal(
      normalizeHomepageBlurbText('```text\nBlurb: Join us Friday.\n```'),
      "Join us Friday.",
    );
  });

  it("clamps to two sentences", () => {
    const long =
      "First sentence here. Second sentence here. Third should go away!";
    assert.equal(
      clampBlurbToMaxSentences(long, HOMEPAGE_BLURB_MAX_SENTENCES),
      "First sentence here. Second sentence here.",
    );
  });

  it("includes seed notes when provided", () => {
    const prompt = buildHomepageBlurbUserPrompt({
      title: "Room Parent meeting",
      seedNotes: "Need helpers for snacks",
      date: "2026-08-10",
      time: "6:00 PM",
      startsOn: null,
      expiresOn: null,
      alwaysOn: true,
      linkUrl: "https://example.com/volunteer",
      organizationName: "Explorer PTO",
      brandVoiceSummary: "Warm and clear",
    });
    assert.match(prompt, /Need helpers for snacks/);
    assert.match(prompt, /Room Parent meeting/);
    assert.match(prompt, /HARD LIMIT: 1 or 2 sentences/);
  });
});
