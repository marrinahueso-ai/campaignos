import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  packCommitteeContactName,
  resolvePackedRoleFromIndex,
} from "../roster-first.ts";

/**
 * Documents the backfill semantics from migration 060:
 * packed contact_name "A, B, C" → chair / co_chair / member rows,
 * then dual-write packs the same shape again.
 */
describe("migration 060 backfill dual-write semantics", () => {
  it("round-trips packed chair names through assignment roles", () => {
    const packedBefore = "Jamie Chair, Sam Co, Alex Member";
    const parts = packedBefore.split(",").map((part) => part.trim());
    const assignments = parts.map((memberName, index) => ({
      role: resolvePackedRoleFromIndex(index),
      memberName,
    }));

    assert.deepEqual(
      assignments.map((entry) => entry.role),
      ["chair", "co_chair", "member"],
    );

    const packedAfter = packCommitteeContactName(assignments);
    assert.equal(packedAfter, packedBefore);
  });

  it("ignores supervising_vp when rewriting packed contact_name", () => {
    const packed = packCommitteeContactName([
      { role: "chair", memberName: "Jamie Chair" },
      { role: "supervising_vp", memberName: "VP Communications" },
    ]);
    assert.equal(packed, "Jamie Chair");
  });
});
