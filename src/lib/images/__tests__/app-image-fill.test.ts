import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { objectFitFromClassName } from "../object-fit.ts";

function readSrc(relativeFromTest: string): string {
  return readFileSync(new URL(relativeFromTest, import.meta.url), "utf8");
}

describe("AppImage fill object-fit", () => {
  it("parses object-fit utilities from className", () => {
    assert.equal(objectFitFromClassName("object-cover object-center"), "cover");
    assert.equal(objectFitFromClassName("foo object-contain bar"), "contain");
    assert.equal(objectFitFromClassName("no-fit"), undefined);
  });

  it("uses plain img for fill so dashboard thumbs do not stretch", () => {
    const src = readSrc("../../../components/images/AppImage.tsx");
    assert.match(src, /Fill mode always uses a plain <img>/);
    assert.match(src, /style=\{\{ \.\.\.style, objectFit \}\}/);
    assert.doesNotMatch(
      src,
      /if \(props\.fill\) \{\s*return \(\s*<Image/,
    );
  });
});
