import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractCampaignSocialFeedUrl } from "@/lib/campaign-builder-v2/extract-social-feed-url";

describe("extractCampaignSocialFeedUrl", () => {
  it("uses the session Event Image feed before later posts", () => {
    const url = extractCampaignSocialFeedUrl({
      mainEventImage: {
        feedUrl: "https://cdn.example/first-half-day-feed.png",
        storyUrl: "https://cdn.example/first-half-day-story.png",
      },
      previewContents: [
        {
          artwork: {
            feedUrl: "https://cdn.example/other-post.png",
            storyUrl: null,
          },
        },
      ],
    });
    assert.equal(url, "https://cdn.example/first-half-day-feed.png");
  });

  it("falls back to the first social post when Event Image is empty", () => {
    const url = extractCampaignSocialFeedUrl({
      mainEventImage: { feedUrl: null, storyUrl: null },
      previewContents: [
        { artwork: { feedUrl: null, storyUrl: null } },
        {
          artwork: {
            feedUrl: "https://cdn.example/fall-break-feed.png",
            storyUrl: null,
          },
        },
      ],
    });
    assert.equal(url, "https://cdn.example/fall-break-feed.png");
  });

  it("ignores placeholder artwork and empty sessions", () => {
    assert.equal(
      extractCampaignSocialFeedUrl({
        mainEventImage: { feedUrl: "/api/placeholder-artwork", storyUrl: null },
        previewContents: [],
      }),
      null,
    );
    assert.equal(extractCampaignSocialFeedUrl(null), null);
    assert.equal(extractCampaignSocialFeedUrl({}), null);
  });
});
