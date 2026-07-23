import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildEventViewsComparison,
  buildEventViewsSeries,
  median,
} from "../event-comparison.ts";

describe("median", () => {
  it("returns null for empty input", () => {
    assert.equal(median([]), null);
  });

  it("handles odd and even lengths", () => {
    assert.equal(median([1, 3, 2]), 2);
    assert.equal(median([10, 20, 30, 40]), 25);
  });
});

describe("buildEventViewsComparison", () => {
  it("omits comparison with fewer than 2 posts", () => {
    assert.equal(buildEventViewsComparison([]), null);
    assert.equal(buildEventViewsComparison([100]), null);
  });

  it("detects more views than typical (right-skewed)", () => {
    const result = buildEventViewsComparison([100, 100, 400]);
    assert.ok(result);
    assert.equal(result.direction, "more");
    assert.equal(result.medianViews, 100);
    assert.equal(result.typicalTotal, 300);
    assert.equal(result.actualTotal, 600);
  });

  it("detects fewer views than typical (left-skewed)", () => {
    const result = buildEventViewsComparison([50, 200, 200]);
    assert.ok(result);
    assert.equal(result.direction, "fewer");
  });

  it("omits when total matches typical", () => {
    assert.equal(buildEventViewsComparison([100, 100]), null);
  });
});

describe("buildEventViewsSeries", () => {
  it("returns null without enough dated posts", () => {
    assert.equal(buildEventViewsSeries([{ publishedAt: null, views: 10 }]), null);
    assert.equal(
      buildEventViewsSeries([
        { publishedAt: "2026-07-01T12:00:00.000Z", views: 10 },
      ]),
      null,
    );
  });

  it("builds cumulative points on real publish days only", () => {
    const series = buildEventViewsSeries([
      { publishedAt: "2026-07-01T12:00:00.000Z", views: 100 },
      { publishedAt: "2026-07-03T12:00:00.000Z", views: 300 },
      { publishedAt: "2026-07-03T18:00:00.000Z", views: 50 },
    ]);

    assert.ok(series);
    assert.equal(series.length, 2);
    assert.equal(series[0].dayIndex, 1);
    assert.equal(series[0].eventViews, 100);
    assert.equal(series[0].typicalViews, 100);
    assert.equal(series[1].dayIndex, 2);
    assert.equal(series[1].eventViews, 450);
    assert.equal(series[1].typicalViews, 300);
  });
});
