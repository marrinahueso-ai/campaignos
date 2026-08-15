import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(
  new URL(
    "../../../components/communications-hub/MessageBubble.tsx",
    import.meta.url,
  ),
  "utf8",
);

describe("MessageBubble reaction picker", () => {
  it("portals the quick-reaction bar out of the timeline clip", () => {
    assert.match(source, /createPortal/);
    assert.match(source, /document\.body/);
    assert.match(source, /Quick reactions/);
    assert.match(source, /fixed z-\[80\]/);
  });
});
