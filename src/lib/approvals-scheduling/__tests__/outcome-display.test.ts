import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  approvalOutcomeChip,
  canRetryFailedApproval,
  isDraftOutcome,
  isFailedOutcome,
  isPostedOutcome,
} from "../outcome-display.ts";
import type { UnifiedApprovalItem } from "../types.ts";

function buildItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "evt-1",
    eventTitle: "Spring Fair",
    campaignName: "Spring Fair",
    milestoneName: "Save the Date",
    thumbnailUrl: null,
    workflowStatus: "scheduled",
    statusDetail: "Ready",
    assigneeName: "Alex",
    assigneeRole: "Chair",
    assigneeInitials: "AL",
    nextAction: "Publishing",
    nextActionTime: "Soon",
    deliveryMethod: "publish-now",
    platforms: ["facebook", "instagram"],
    scheduleAt: null,
    scheduleLabel: null,
    assignedToMe: true,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: null,
    schedulingItemId: "sched-1",
    campaignMilestoneId: "ms-1",
    metaRelativeDay: 14,
    publishError: null,
    channel: null,
    notes: null,
    preview: {
      captionText: null,
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-07-01T10:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("approvalOutcomeChip", () => {
  it("labels successful Meta publishes as Posted", () => {
    assert.equal(
      approvalOutcomeChip(buildItem({ workflowStatus: "published" })).label,
      "Posted",
    );
  });

  it("labels draft-only as Draft, not Posted", () => {
    const item = buildItem({
      workflowStatus: "scheduled",
      deliveryMethod: "draft-only",
    });
    assert.equal(approvalOutcomeChip(item).label, "Draft");
    assert.equal(isDraftOutcome(item), true);
    assert.equal(isPostedOutcome(item), false);
  });

  it("surfaces Failed with Retry eligibility", () => {
    const item = buildItem({
      workflowStatus: "failed",
      publishError: "Couldn’t post to your Page.",
    });
    assert.equal(approvalOutcomeChip(item).label, "Failed");
    assert.equal(isFailedOutcome(item), true);
    assert.equal(canRetryFailedApproval(item), true);
  });
});
