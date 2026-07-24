import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultVolunteersMasterLayout,
  normalizeVolunteersMasterLayout,
  reorderVolunteersMasterKpi,
  setVolunteersMasterKpiColor,
} from "../volunteers-master-layout.ts";

describe("volunteers master layout", () => {
  it("defaults to product KPI order", () => {
    assert.deepEqual(defaultVolunteersMasterLayout().order, [
      "total_volunteers",
      "fill_rate",
      "underfilled",
      "upcoming",
    ]);
  });

  it("normalizes order and colors", () => {
    const layout = normalizeVolunteersMasterLayout({
      order: ["upcoming", "bogus", "fill_rate", "upcoming"],
      colors: { fill_rate: "#CC9C48", bogus: "#fff" },
    });
    assert.deepEqual(layout.order, [
      "upcoming",
      "fill_rate",
      "total_volunteers",
      "underfilled",
    ]);
    assert.equal(layout.colors?.fill_rate, "#cc9c48");
  });

  it("reorders and clears colors", () => {
    const colored = setVolunteersMasterKpiColor(
      defaultVolunteersMasterLayout(),
      "underfilled",
      "#d06650",
    );
    const moved = reorderVolunteersMasterKpi(
      colored,
      "underfilled",
      "total_volunteers",
    );
    assert.equal(moved.order[0], "underfilled");
    assert.equal(moved.colors?.underfilled, "#d06650");
    assert.equal(
      setVolunteersMasterKpiColor(moved, "underfilled", null).colors,
      undefined,
    );
  });
});
