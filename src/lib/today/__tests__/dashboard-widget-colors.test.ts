import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dashboardWidgetSupportsColor,
  getDashboardCardTone,
  isDarkDashboardCardColor,
  normalizeDashboardCardColor,
} from "../dashboard-widget-colors.ts";
import {
  normalizeDashboardLayout,
  setDashboardWidgetColor,
} from "../dashboard-widgets.ts";

describe("dashboard widget colors", () => {
  it("allows colorable widgets and blocks fixed ones", () => {
    assert.equal(dashboardWidgetSupportsColor("volunteers"), true);
    assert.equal(dashboardWidgetSupportsColor("attention"), true);
    assert.equal(dashboardWidgetSupportsColor("weather"), false);
    assert.equal(dashboardWidgetSupportsColor("up_next"), false);
    assert.equal(dashboardWidgetSupportsColor("calendar"), false);
  });

  it("normalizes hex colors", () => {
    assert.equal(normalizeDashboardCardColor("#CC9C48"), "#cc9c48");
    assert.equal(normalizeDashboardCardColor("nope"), null);
  });

  it("treats navy/espresso as dark for light text", () => {
    assert.equal(isDarkDashboardCardColor("#18243b"), true);
    assert.equal(isDarkDashboardCardColor("#2a2622"), true);
    assert.equal(isDarkDashboardCardColor("#ebe4d9"), false);
    const tone = getDashboardCardTone("#18243b");
    assert.ok(tone);
    assert.equal(tone.text, "#fffcf7");
  });

  it("persists colors through layout normalize and setters", () => {
    const withColor = setDashboardWidgetColor(
      normalizeDashboardLayout(null),
      "good_news",
      "#d06650",
    );
    assert.equal(withColor.colors?.good_news, "#d06650");

    const roundTrip = normalizeDashboardLayout(withColor);
    assert.equal(roundTrip.colors?.good_news, "#d06650");

    const cleared = setDashboardWidgetColor(roundTrip, "good_news", null);
    assert.equal(cleared.colors?.good_news, undefined);
  });
});
