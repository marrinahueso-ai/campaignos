import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRelativeDay } from "../constants.ts";
import {
  isTimingCatalogSuggestedTitle,
  resolveTimingCatalogId,
  TIMING_CATALOG,
  TIMING_CATALOG_CUSTOM_VALUE,
  timingCatalogByGroup,
} from "../timing-catalog.ts";

describe("timing catalog", () => {
  it("lists before and after groups without hourly offsets", () => {
    const before = timingCatalogByGroup("before");
    const after = timingCatalogByGroup("after");
    assert.ok(before.length >= 12);
    assert.ok(after.length >= 4);
    assert.equal(
      TIMING_CATALOG.some((entry) => /hour/i.test(entry.label)),
      false,
    );
  });

  it("resolves unique offsets and day-0 by best-use title", () => {
    assert.equal(resolveTimingCatalogId(-14), "before-14");
    assert.equal(resolveTimingCatalogId(0, "Happening today"), "before-0");
    assert.equal(resolveTimingCatalogId(0, "Thank you"), "after-0");
    assert.equal(resolveTimingCatalogId(0), "before-0");
    assert.equal(resolveTimingCatalogId(-90), TIMING_CATALOG_CUSTOM_VALUE);
  });

  it("treats catalog best-use and New Step as suggested titles", () => {
    assert.equal(isTimingCatalogSuggestedTitle("Weekly reminder"), true);
    assert.equal(isTimingCatalogSuggestedTitle("New Step"), true);
    assert.equal(isTimingCatalogSuggestedTitle("Our custom title"), false);
  });

  it("formats catalog days with curated labels", () => {
    assert.equal(formatRelativeDay(-7), "7 days before");
    assert.equal(formatRelativeDay(0), "Day of");
    assert.equal(formatRelativeDay(7), "7 days after");
    assert.equal(formatRelativeDay(-90), "90 days before");
  });
});
