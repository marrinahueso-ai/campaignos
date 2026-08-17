import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const homepageSource = readFileSync(
  join(process.cwd(), "src/components/homepage-composer/HomepageComposer.tsx"),
  "utf8",
);
const datePopoverSource = readFileSync(
  join(process.cwd(), "src/components/homepage-composer/DatePopoverField.tsx"),
  "utf8",
);

describe("homepage composer date popover", () => {
  it("uses a floating DatePopoverField instead of native type=date expand hacks", () => {
    assert.match(homepageSource, /DatePopoverField/);
    assert.doesNotMatch(homepageSource, /type="date"/);
    assert.doesNotMatch(homepageSource, /focus-within:pb-\[min\(20rem/);
    assert.match(datePopoverSource, /createPortal/);
    assert.match(datePopoverSource, /fixed z-\[200\]/);
  });

  it("lets a calendar day choose the date without requiring Clear first", () => {
    assert.match(datePopoverSource, /function chooseDate\(iso: string\)/);
    assert.match(datePopoverSource, /Boolean\(value\) && value === iso/);
    assert.match(datePopoverSource, /clearable && value/);
    assert.match(homepageSource, /anchorDate=\{card\.startsOn \?\? card\.date\}/);
  });
});
