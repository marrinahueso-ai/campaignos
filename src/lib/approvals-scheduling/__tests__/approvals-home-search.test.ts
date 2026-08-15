import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approvalMatchesSearch,
  buildApprovalSearchHaystack,
  shouldApplyApprovalsEasePulseFilter,
} from "../approvals-home-search.ts";
import type { UnifiedApprovalItem } from "../types.ts";

function stubItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "event-1",
    eventTitle: "New Family and Kindergarten Play date",
    campaignName: "New Family and Kindergarten Play date",
    milestoneName: "Save the date",
    thumbnailUrl: null,
    workflowStatus: "assigned_to_me",
    statusDetail: "Due today",
    assigneeName: "Alex Rivera",
    assigneeRole: "Communications",
    assigneeInitials: "AR",
    nextAction: "Review and approve",
    nextActionTime: "Today",
    deliveryMethod: "schedule",
    platforms: ["facebook", "instagram"],
    scheduleAt: "2026-07-28T14:00:00.000Z",
    scheduleLabel: "Jul 28, 2026 9:00 AM",
    assignedToMe: true,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: null,
    schedulingItemId: "sched-1",
    campaignMilestoneId: "ms-1",
    metaRelativeDay: null,
    publishError: null,
    channel: null,
    notes: null,
    preview: {
      captionText: "Join us for play date fun!",
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-07-01T12:00:00.000Z",
    approvalHistory: [
      {
        label: "Submitted for approval",
        timestamp: "2026-07-01T12:00:00.000Z",
        actor: "Creator",
      },
    ],
    ...overrides,
  };
}

describe("shouldApplyApprovalsEasePulseFilter", () => {
  it("is true only when search is empty (deferred-load gate)", () => {
    assert.equal(shouldApplyApprovalsEasePulseFilter(""), true);
    assert.equal(shouldApplyApprovalsEasePulseFilter("   "), true);
    assert.equal(shouldApplyApprovalsEasePulseFilter("play date"), false);
  });
});

describe("approvalMatchesSearch", () => {
  it("matches event names, people, captions, and status labels", () => {
    const item = stubItem();

    assert.equal(approvalMatchesSearch(item, "kindergarten"), true);
    assert.equal(approvalMatchesSearch(item, "alex"), true);
    assert.equal(approvalMatchesSearch(item, "play date fun"), true);
    assert.equal(approvalMatchesSearch(item, "needs approval"), true);
    assert.equal(approvalMatchesSearch(item, "not-a-match-xyz"), false);
  });

  it("matches month and date forms like Events Home", () => {
    const item = stubItem();

    assert.equal(approvalMatchesSearch(item, "jul 28"), true);
    assert.equal(approvalMatchesSearch(item, "july"), true);
    assert.equal(approvalMatchesSearch(item, "7/28"), true);
    assert.equal(approvalMatchesSearch(item, "tuesday"), true);
  });

  it("includes outcome chip labels in the haystack", () => {
    const scheduled = stubItem({ workflowStatus: "scheduled" });
    const haystack = buildApprovalSearchHaystack(scheduled);
    assert.match(haystack, /scheduled/);
  });
});
