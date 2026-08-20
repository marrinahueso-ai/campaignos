import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const homepageSource = readFileSync(
  join(process.cwd(), "src/components/homepage-composer/HomepageComposer.tsx"),
  "utf8",
);

describe("homepage composer card artwork download", () => {
  it("lets chairs download a card image by clicking the thumbnail", () => {
    assert.match(homepageSource, /downloadCardArtwork/);
    assert.match(homepageSource, /downloadArtworkImage/);
    assert.match(homepageSource, /Download image/);
    assert.match(homepageSource, /homepageCardDownloadFilename/);
    assert.match(homepageSource, /Download \$\{card\.title/);
  });
});
