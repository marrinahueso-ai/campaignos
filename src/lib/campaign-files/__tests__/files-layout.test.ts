import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FILES_ALL_EVENTS_KEY,
  defaultFilesLayout,
  normalizeFilesLayout,
  reorderFilesEventCard,
  setFilesEventCardColor,
} from "../files-layout.ts";

describe("files layout", () => {
  it("defaults with all + event ids", () => {
    assert.deepEqual(defaultFilesLayout(["e1", "e2"]).order, [
      FILES_ALL_EVENTS_KEY,
      "e1",
      "e2",
    ]);
  });

  it("keeps known events, drops removed, appends new", () => {
    const layout = normalizeFilesLayout(
      {
        order: ["e2", "all", "gone", "e2"],
        colors: { e2: "#CC9C48", gone: "#ffffff" },
      },
      ["e1", "e2"],
    );
    assert.deepEqual(layout.order, ["e2", "all", "e1"]);
    assert.equal(layout.colors?.e2, "#cc9c48");
    assert.equal(layout.colors?.gone, undefined);
  });

  it("reorders and clears colors", () => {
    const colored = setFilesEventCardColor(
      defaultFilesLayout(["e1"]),
      "e1",
      "#d06650",
    );
    const moved = reorderFilesEventCard(colored, "e1", FILES_ALL_EVENTS_KEY);
    assert.equal(moved.order[0], "e1");
    assert.equal(moved.colors?.e1, "#d06650");
    assert.equal(setFilesEventCardColor(moved, "e1", null).colors, undefined);
  });
});
