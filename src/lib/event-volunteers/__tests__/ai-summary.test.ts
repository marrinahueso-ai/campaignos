import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVolunteerAiSummary } from "@/lib/event-volunteers/ai-summary";
import type { VolunteerAssignmentView } from "@/lib/event-volunteers/types";

const assignments: VolunteerAssignmentView[] = [
  {
    externalKey: "1",
    name: "Event Cleanup",
    quantityRequested: 3,
    quantityFilled: 0,
    quantityOpen: 3,
    availabilityStatus: "high_need",
    sourceOrder: 0,
  },
  {
    externalKey: "2",
    name: "Greeting",
    quantityRequested: 4,
    quantityFilled: 3,
    quantityOpen: 1,
    availabilityStatus: "nearly_full",
    sourceOrder: 1,
  },
];

describe("volunteer AI summary", () => {
  it("uses structured data only and does not invent totals", () => {
    const summary = buildVolunteerAiSummary({
      summary: {
        totalSpots: 7,
        filledSpots: 3,
        openSpots: 4,
        overallFilledPercent: 43,
        fullAssignmentCount: 0,
        needsHelpCount: 1,
        nearlyFullCount: 1,
        unknownAssignmentCount: 0,
        assignmentCount: 2,
        quantitiesComplete: true,
      },
      assignments,
      lastSuccessfulSyncAt: "2026-07-16T13:42:00.000Z",
      syncFailed: false,
      previousSummary: null,
    });

    assert.match(summary.headline, /4 spots remain/);
    assert.match(summary.bullets.join(" "), /Event Cleanup/);
    assert.doesNotMatch(summary.bullets.join(" "), /slowed|increased since/);
  });

  it("does not claim a trend with only one snapshot", () => {
    const summary = buildVolunteerAiSummary({
      summary: {
        totalSpots: 7,
        filledSpots: 3,
        openSpots: 4,
        overallFilledPercent: 43,
        fullAssignmentCount: 0,
        needsHelpCount: 1,
        nearlyFullCount: 1,
        unknownAssignmentCount: 0,
        assignmentCount: 2,
        quantitiesComplete: true,
      },
      assignments,
      lastSuccessfulSyncAt: null,
      syncFailed: false,
    });
    assert.doesNotMatch(summary.bullets.join(" "), /previous snapshot/);
  });

  it("mentions stale data when sync failed", () => {
    const summary = buildVolunteerAiSummary({
      summary: {
        totalSpots: 7,
        filledSpots: 3,
        openSpots: 4,
        overallFilledPercent: 43,
        fullAssignmentCount: 0,
        needsHelpCount: 1,
        nearlyFullCount: 1,
        unknownAssignmentCount: 0,
        assignmentCount: 2,
        quantitiesComplete: true,
      },
      assignments,
      lastSuccessfulSyncAt: "2026-07-16T13:42:00.000Z",
      syncFailed: true,
    });
    assert.match(summary.staleNote ?? "", /could not be refreshed/);
  });
});
