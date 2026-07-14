import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPhasePlanLabel } from "@/lib/artwork-v2/campaign-phases";

describe("campaign builder artwork plan labels", () => {
  it("matches Creative Studio / Meta phase feed labels", () => {
    assert.equal(
      buildPhasePlanLabel("Two-Week Push", "Feed (1:1)"),
      "Two-Week Push — Feed (1:1)",
    );
  });

  it("matches Creative Studio / Meta phase story labels", () => {
    assert.equal(
      buildPhasePlanLabel("Save the Date", "Story"),
      "Save the Date — Story",
    );
  });
});
