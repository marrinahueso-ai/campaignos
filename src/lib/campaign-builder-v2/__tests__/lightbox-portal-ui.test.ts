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

describe("Preview artwork lightbox", () => {
  it("portals enlarge lightbox above the app shell", () => {
    assert.match(source, /createPortal/);
    assert.match(source, /smc-lightbox-host/);
    assert.match(source, /document\.body/);
  });
});
