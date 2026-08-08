import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("ArtworkLightboxThumbnail", () => {
  it("uses contain for story (9:16) so square art is not cropped", () => {
    const src = readFileSync(
      new URL("../ArtworkLightboxThumbnail.tsx", import.meta.url),
      "utf8",
    );
    assert.match(src, /variant === "story" \? "contain" : "cover"/);
    assert.match(src, /object-contain/);
  });
});
