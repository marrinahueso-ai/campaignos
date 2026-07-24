import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultVendorsDirectoryLayout,
  normalizeVendorsDirectoryLayout,
  reorderVendorsDirectorySummary,
  setVendorsDirectorySummaryColor,
} from "../vendors-directory-layout.ts";

describe("vendors directory layout", () => {
  it("defaults to product summary order", () => {
    assert.deepEqual(defaultVendorsDirectoryLayout().order, [
      "total_vendors",
      "confirmed",
      "upcoming_events",
      "favorite_vendors",
    ]);
  });

  it("normalizes order and colors", () => {
    const layout = normalizeVendorsDirectoryLayout({
      order: ["favorite_vendors", "bogus", "confirmed", "favorite_vendors"],
      colors: { confirmed: "#CC9C48", bogus: "#fff" },
    });
    assert.deepEqual(layout.order, [
      "favorite_vendors",
      "confirmed",
      "total_vendors",
      "upcoming_events",
    ]);
    assert.equal(layout.colors?.confirmed, "#cc9c48");
  });

  it("reorders and clears colors", () => {
    const colored = setVendorsDirectorySummaryColor(
      defaultVendorsDirectoryLayout(),
      "upcoming_events",
      "#d06650",
    );
    const moved = reorderVendorsDirectorySummary(
      colored,
      "upcoming_events",
      "total_vendors",
    );
    assert.equal(moved.order[0], "upcoming_events");
    assert.equal(moved.colors?.upcoming_events, "#d06650");
    assert.equal(
      setVendorsDirectorySummaryColor(moved, "upcoming_events", null).colors,
      undefined,
    );
  });
});
