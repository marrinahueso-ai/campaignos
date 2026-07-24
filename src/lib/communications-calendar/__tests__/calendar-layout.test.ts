import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_CALENDAR_LAYER_COLORS,
  defaultCalendarLayout,
  normalizeCalendarLayout,
  resolveCalendarLayerColor,
  setCalendarLayerColor,
} from "../calendar-layout.ts";

describe("calendar layout", () => {
  it("defaults to empty overrides", () => {
    assert.deepEqual(defaultCalendarLayout(), { version: 1 });
    assert.equal(
      resolveCalendarLayerColor(defaultCalendarLayout(), "scheduled"),
      DEFAULT_CALENDAR_LAYER_COLORS.scheduled,
    );
  });

  it("normalizes colors and drops unknowns", () => {
    const layout = normalizeCalendarLayout({
      colors: { scheduled: "#CC9C48", bogus: "#ffffff" },
    });
    assert.equal(layout.colors?.scheduled, "#cc9c48");
    assert.equal(
      (layout.colors as Record<string, string> | undefined)?.bogus,
      undefined,
    );
  });

  it("sets and clears layer colors", () => {
    const colored = setCalendarLayerColor(
      defaultCalendarLayout(),
      "published",
      "#d06650",
    );
    assert.equal(colored.colors?.published, "#d06650");
    const cleared = setCalendarLayerColor(colored, "published", null);
    assert.equal(cleared.colors, undefined);
    // Resetting to the product default clears the override.
    const resetDefault = setCalendarLayerColor(
      colored,
      "published",
      DEFAULT_CALENDAR_LAYER_COLORS.published,
    );
    assert.equal(resetDefault.colors?.published, undefined);
  });
});
