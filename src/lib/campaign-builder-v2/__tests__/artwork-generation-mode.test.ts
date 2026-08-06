import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveMilestoneArtworkGenerationPass,
  STORY_FROM_FEED_ADJUST_INSTRUCTION,
} from "../artwork-generation-mode.ts";

describe("resolveMilestoneArtworkGenerationPass", () => {
  it("adjusts feed from the existing 1:1 image with the same direction", () => {
    const pass = resolveMilestoneArtworkGenerationPass({
      view: "feed",
      existingUrl: "https://cdn.example/feed.png",
      feedUrl: "https://cdn.example/feed.png",
      lockedInstructions: "save the date — no volunteer CTA",
    });

    assert.equal(pass.isAdjust, true);
    assert.equal(pass.storyFromFeed, false);
    assert.equal(pass.previousImageUrl, "https://cdn.example/feed.png");
    assert.equal(pass.extraInstructions, null);
    assert.equal(pass.adjustmentComments, "save the date — no volunteer CTA");
  });

  it("derives story from feed via adjust using the same direction", () => {
    const pass = resolveMilestoneArtworkGenerationPass({
      view: "story",
      existingUrl: "https://cdn.example/old-story.png",
      feedUrl: "https://cdn.example/new-feed.png",
      lockedInstructions: "save the date — no volunteer CTA",
    });

    assert.equal(pass.isAdjust, true);
    assert.equal(pass.storyFromFeed, true);
    assert.equal(pass.previousImageUrl, "https://cdn.example/new-feed.png");
    assert.equal(pass.extraInstructions, null);
    assert.match(pass.adjustmentComments ?? "", /save the date — no volunteer CTA/);
    assert.match(pass.adjustmentComments ?? "", /9:16/);
    assert.match(
      pass.adjustmentComments ?? "",
      new RegExp(STORY_FROM_FEED_ADJUST_INSTRUCTION.slice(0, 40)),
    );
  });

  it("still adapts story from feed when there is no extra user direction", () => {
    const pass = resolveMilestoneArtworkGenerationPass({
      view: "story",
      existingUrl: null,
      feedUrl: "https://cdn.example/feed.png",
      lockedInstructions: "",
    });

    assert.equal(pass.isAdjust, true);
    assert.equal(pass.storyFromFeed, true);
    assert.equal(pass.previousImageUrl, "https://cdn.example/feed.png");
    assert.equal(pass.adjustmentComments, STORY_FROM_FEED_ADJUST_INSTRUCTION);
  });

  it("creates feed from scratch when there is no prior feed image", () => {
    const pass = resolveMilestoneArtworkGenerationPass({
      view: "feed",
      existingUrl: null,
      feedUrl: null,
      lockedInstructions: "bright school supply collage",
    });

    assert.equal(pass.isAdjust, false);
    assert.equal(pass.previousImageUrl, null);
    assert.equal(pass.extraInstructions, "bright school supply collage");
    assert.equal(pass.adjustmentComments, null);
  });
});
