import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { pickDefaultCreateWithAiEvent } from "../default-event.ts";

describe("pickDefaultCreateWithAiEvent", () => {
  it("returns null for an empty list", () => {
    assert.equal(pickDefaultCreateWithAiEvent([]), null);
  });

  it("prefers the soonest upcoming event", () => {
    const picked = pickDefaultCreateWithAiEvent(
      [
        { id: "past", date: "2026-01-01" },
        { id: "soon", date: "2026-08-01" },
        { id: "later", date: "2026-12-01" },
      ],
      "2026-07-22",
    );
    assert.equal(picked?.id, "soon");
  });

  it("falls back to the most recent past event when all are past", () => {
    const picked = pickDefaultCreateWithAiEvent(
      [
        { id: "older", date: "2025-01-01" },
        { id: "newer", date: "2026-06-01" },
      ],
      "2026-07-22",
    );
    assert.equal(picked?.id, "newer");
  });
});
