import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  insertCanvasBlockAfter,
  newCanvasBlock,
} from "@/lib/newsletter-composer/defaults";

describe("insertCanvasBlockAfter", () => {
  it("inserts immediately after the selected block", () => {
    const a = newCanvasBlock("heading", { id: "a", heading: "A" });
    const b = newCanvasBlock("text", { id: "b", text: "B" });
    const c = newCanvasBlock("image", { id: "c" });
    const next = insertCanvasBlockAfter([a, b], c, "a");
    assert.deepEqual(
      next.map((block) => block.id),
      ["a", "c", "b"],
    );
  });

  it("appends when nothing is selected", () => {
    const a = newCanvasBlock("heading", { id: "a" });
    const b = newCanvasBlock("text", { id: "b" });
    const next = insertCanvasBlockAfter([a], b, null);
    assert.deepEqual(
      next.map((block) => block.id),
      ["a", "b"],
    );
  });

  it("appends when the selected id is missing", () => {
    const a = newCanvasBlock("heading", { id: "a" });
    const b = newCanvasBlock("text", { id: "b" });
    const next = insertCanvasBlockAfter([a], b, "missing");
    assert.deepEqual(
      next.map((block) => block.id),
      ["a", "b"],
    );
  });
});
