import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL(
    "../../../components/campaign-builder-v2/social-composer/SocialMediaComposer.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("Preview main event image UI", () => {
  it("surfaces Event Image and Change image without Apply-to-all buttons", () => {
    assert.match(source, /Event Image/);
    assert.match(source, /Used for all posts unless replaced/);
    assert.match(source, /Using main event image/);
    assert.match(source, /Change image/);
    assert.match(source, /applyMilestoneArtwork/);
    assert.doesNotMatch(source, /Apply to all posts/);
    assert.doesNotMatch(source, /Apply this image to all posts/);
  });
});
