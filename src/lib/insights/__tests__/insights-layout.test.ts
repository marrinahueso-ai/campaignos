import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultInsightsLayout,
  normalizeInsightsLayout,
  reorderInsightsKpi,
  setInsightsKpiColor,
} from "../insights-layout.ts";

describe("insights layout", () => {
  it("defaults to product KPI order", () => {
    assert.deepEqual(defaultInsightsLayout().order, [
      "views",
      "reach",
      "engagement",
      "likes",
      "comments",
    ]);
  });

  it("normalizes order and colors", () => {
    const layout = normalizeInsightsLayout({
      order: ["comments", "bogus", "views", "comments"],
      colors: { views: "#CC9C48" },
    });
    assert.deepEqual(layout.order, [
      "comments",
      "views",
      "reach",
      "engagement",
      "likes",
    ]);
    assert.equal(layout.colors?.views, "#cc9c48");
  });

  it("reorders and clears colors", () => {
    const colored = setInsightsKpiColor(
      defaultInsightsLayout(),
      "reach",
      "#d06650",
    );
    const moved = reorderInsightsKpi(colored, "reach", "views");
    assert.equal(moved.order[0], "reach");
    assert.equal(moved.colors?.reach, "#d06650");
    assert.equal(setInsightsKpiColor(moved, "reach", null).colors, undefined);
  });
});
