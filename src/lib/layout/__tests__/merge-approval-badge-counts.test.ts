import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { mergeApprovalBadgeCounts } from "@/lib/layout/merge-approval-badge-counts";

describe("mergeApprovalBadgeCounts", () => {
  it("adds classic and scheduling counts so flyers are not dropped", () => {
    const merged = mergeApprovalBadgeCounts(
      { assignedApprovalsCount: 2, changeRequestsCount: 1 },
      { assignedApprovalsCount: 3, changeRequestsCount: 1 },
    );
    assert.deepEqual(merged, {
      assignedApprovalsCount: 5,
      changeRequestsCount: 2,
    });
  });
});

describe("dashboard badge load uses the sum merge", () => {
  it("does not take Math.max of classic vs scheduling", () => {
    const source = readFileSync(
      new URL("../dashboard-badge-counts.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /mergeApprovalBadgeCounts/);
    assert.doesNotMatch(source, /Math\.max\(/);
  });
});
