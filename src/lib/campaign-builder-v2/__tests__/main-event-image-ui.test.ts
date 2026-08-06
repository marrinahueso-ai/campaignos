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
  it("keeps auto-reuse wiring without Event Image / Change image chrome", () => {
    assert.match(source, /applyMilestoneArtwork/);
    assert.doesNotMatch(source, /Event Image/);
    assert.doesNotMatch(source, /Used for all posts unless replaced/);
    assert.doesNotMatch(source, /Using main event image/);
    assert.doesNotMatch(source, /Change image/);
    assert.doesNotMatch(source, /Apply to all posts/);
  });
});
