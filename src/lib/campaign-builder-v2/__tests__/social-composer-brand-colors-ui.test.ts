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

describe("Social Setup brand colors", () => {
  it("lets the founder pick, add, and remove colors — not static swatches", () => {
    assert.match(source, /resolveSetupBrandColors/);
    assert.match(source, /commitSetupBrandColors/);
    assert.match(source, /type="color"/);
    assert.match(source, /Add brand color/);
    assert.match(source, /Remove brand color/);
    assert.match(source, /Click a color to change it/);
    assert.doesNotMatch(source, /No colors yet — set them in your brand kit/);
    assert.doesNotMatch(
      source,
      /className="swatch"\s*\n\s*style=\{\{ background: color \}\}/,
    );
  });
});
