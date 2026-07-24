import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultApprovalsLayout,
  normalizeApprovalsLayout,
  reorderApprovalsCard,
  setApprovalsCardColor,
} from "../approvals-layout.ts";

describe("approvals layout", () => {
  it("defaults to product card order", () => {
    assert.deepEqual(defaultApprovalsLayout().order, [
      "assigned_to_me",
      "changes_requested",
      "in_queue",
      "scheduled",
      "published",
    ]);
  });

  it("normalizes order and colors", () => {
    const layout = normalizeApprovalsLayout({
      order: ["published", "bogus", "in_queue", "published"],
      colors: { in_queue: "#CC9C48" },
    });
    assert.deepEqual(layout.order, [
      "published",
      "in_queue",
      "assigned_to_me",
      "changes_requested",
      "scheduled",
    ]);
    assert.equal(layout.colors?.in_queue, "#cc9c48");
  });

  it("reorders and clears colors", () => {
    const colored = setApprovalsCardColor(
      defaultApprovalsLayout(),
      "scheduled",
      "#d06650",
    );
    const moved = reorderApprovalsCard(
      colored,
      "scheduled",
      "assigned_to_me",
    );
    assert.equal(moved.order[0], "scheduled");
    assert.equal(moved.colors?.scheduled, "#d06650");
    assert.equal(
      setApprovalsCardColor(moved, "scheduled", null).colors,
      undefined,
    );
  });
});
