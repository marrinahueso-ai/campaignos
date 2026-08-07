import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canOptimizeWithNextImage,
  isLocalOrDataImageUrl,
  toDisplayImageUrl,
} from "../display.ts";

const PUBLIC =
  "https://project.supabase.co/storage/v1/object/public/event-assets/e1/feed/art.png";

describe("toDisplayImageUrl", () => {
  it("applies card preset transforms for display intent", () => {
    const result = toDisplayImageUrl(PUBLIC, { preset: "card" });
    assert.match(result, /\/render\/image\/public\/event-assets\//);
    assert.match(result, /width=360/);
    assert.match(result, /quality=72/);
    assert.match(result, /resize=cover/);
  });

  it("uses thumb preset for list cells", () => {
    const result = toDisplayImageUrl(PUBLIC, { preset: "thumb" });
    assert.match(result, /width=128/);
  });

  it("does not force height when only width is overridden", () => {
    const result = toDisplayImageUrl(PUBLIC, {
      preset: "card",
      width: 560,
      resize: "contain",
    });
    assert.match(result, /width=560/);
    assert.doesNotMatch(result, /height=/);
  });

  it("leaves originals untouched when intent is original", () => {
    assert.equal(
      toDisplayImageUrl(PUBLIC, { intent: "original", preset: "card" }),
      PUBLIC,
    );
  });

  it("does not rewrite signed or foreign URLs", () => {
    const signed =
      "https://project.supabase.co/storage/v1/object/sign/event-assets/art.png?token=abc";
    assert.equal(toDisplayImageUrl(signed, { preset: "thumb" }), signed);
    assert.equal(
      toDisplayImageUrl("https://cdn.example.com/a.png", { preset: "thumb" }),
      "https://cdn.example.com/a.png",
    );
  });
});

describe("image URL classifiers", () => {
  it("detects next/image-optimizable Supabase hosts", () => {
    assert.equal(canOptimizeWithNextImage(PUBLIC), true);
    assert.equal(canOptimizeWithNextImage("https://cdn.example.com/a.png"), false);
  });

  it("detects local and data URLs", () => {
    assert.equal(isLocalOrDataImageUrl("blob:https://x/1"), true);
    assert.equal(isLocalOrDataImageUrl("data:image/png;base64,aa"), true);
    assert.equal(isLocalOrDataImageUrl("/images/home-hero.png"), true);
    assert.equal(isLocalOrDataImageUrl(PUBLIC), false);
  });
});
