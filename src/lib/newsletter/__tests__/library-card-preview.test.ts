import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH,
  newsletterLibraryPreviewScale,
} from "../library-card-preview.ts";

describe("newsletter library card preview scale", () => {
  it("fills the card width instead of a fixed tiny thumbnail", () => {
    assert.equal(NEWSLETTER_LIBRARY_PREVIEW_SOURCE_WIDTH, 560);
    assert.equal(newsletterLibraryPreviewScale(280), 0.5);
    assert.equal(newsletterLibraryPreviewScale(560), 1);
    assert.equal(newsletterLibraryPreviewScale(0), 0);
  });

  it("does not use a hardcoded scale that letterboxes the library card", () => {
    const source = readFileSync(
      new URL(
        "../../../components/newsletters/NewsletterLibraryCardPreview.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.doesNotMatch(source, /PREVIEW_SCALE = 0\.32/);
    assert.match(source, /newsletterLibraryPreviewScale/);
    assert.match(source, /ResizeObserver/);
  });
});
