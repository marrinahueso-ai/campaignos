import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rejectArtworkView } from "../reject-artwork.ts";

describe("rejectArtworkView", () => {
  it("clears only the feed slot", () => {
    const next = rejectArtworkView(
      {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      "feed",
    );
    assert.equal(next.feedUrl, null);
    assert.equal(next.storyUrl, "https://example.com/story.png");
  });

  it("clears only the story slot", () => {
    const next = rejectArtworkView(
      {
        feedUrl: "https://example.com/feed.png",
        storyUrl: "https://example.com/story.png",
      },
      "story",
    );
    assert.equal(next.feedUrl, "https://example.com/feed.png");
    assert.equal(next.storyUrl, null);
  });
});
