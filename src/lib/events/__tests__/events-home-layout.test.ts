import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultEventsHomeLayout,
  normalizeEventsHomeLayout,
  reorderEventsHomeCard,
  setEventsHomeCardColor,
} from "../events-home-layout.ts";

describe("events home layout", () => {
  it("defaults to product card order", () => {
    const layout = defaultEventsHomeLayout();
    assert.deepEqual(layout.order, [
      "next_60_days",
      "needs_setup",
      "ready_to_run",
      "needs_follow_up",
      "done",
    ]);
    assert.equal(layout.version, 1);
  });

  it("normalizes order, drops unknowns, and appends missing keys", () => {
    const layout = normalizeEventsHomeLayout({
      version: 1,
      order: ["done", "bogus", "needs_setup", "done"],
      colors: { needs_setup: "#CC9C48", bogus: "#ffffff" },
    });
    assert.deepEqual(layout.order, [
      "done",
      "needs_setup",
      "next_60_days",
      "ready_to_run",
      "needs_follow_up",
    ]);
    assert.equal(layout.colors?.needs_setup, "#cc9c48");
    assert.equal(layout.colors?.bogus, undefined);
  });

  it("reorders cards and persists colors", () => {
    const base = defaultEventsHomeLayout();
    const colored = setEventsHomeCardColor(base, "ready_to_run", "#d06650");
    const moved = reorderEventsHomeCard(
      colored,
      "ready_to_run",
      "next_60_days",
    );
    assert.equal(moved.order[0], "ready_to_run");
    assert.equal(moved.order[1], "next_60_days");
    assert.equal(moved.colors?.ready_to_run, "#d06650");

    const cleared = setEventsHomeCardColor(moved, "ready_to_run", null);
    assert.equal(cleared.colors, undefined);
  });
});
