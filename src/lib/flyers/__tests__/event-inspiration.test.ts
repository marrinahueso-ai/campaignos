import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveFlyerEventInspirationUrl } from "@/lib/flyers/event-inspiration";

describe("resolveFlyerEventInspirationUrl", () => {
  it("prefers the social campaign feed over event-workspace hero art", () => {
    assert.equal(
      resolveFlyerEventInspirationUrl({
        socialFeedUrl: "https://cdn.example/social-feed.png",
        heroArtworkUrl: "https://cdn.example/hero.png",
        approvedSquareUrl: "https://cdn.example/square.png",
      }),
      "https://cdn.example/social-feed.png",
    );
  });

  it("falls back to hero then approved square", () => {
    assert.equal(
      resolveFlyerEventInspirationUrl({
        socialFeedUrl: null,
        heroArtworkUrl: "https://cdn.example/hero.png",
        approvedSquareUrl: "https://cdn.example/square.png",
      }),
      "https://cdn.example/hero.png",
    );
    assert.equal(
      resolveFlyerEventInspirationUrl({
        approvedSquareUrl: "https://cdn.example/square.png",
      }),
      "https://cdn.example/square.png",
    );
  });

  it("skips blob and empty URLs", () => {
    assert.equal(
      resolveFlyerEventInspirationUrl({
        socialFeedUrl: "blob:http://localhost/x",
        heroArtworkUrl: "  ",
        approvedSquareUrl: null,
      }),
      null,
    );
  });
});
