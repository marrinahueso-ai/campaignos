import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLiveMilestoneNames,
  displayApprovalPostName,
  isChannelPostName,
} from "../milestone-display-names.ts";
import type { UnifiedApprovalItem } from "../types.ts";

function stubItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "campaign_builder",
    eventId: "event-1",
    eventTitle: "Spring Gala",
    campaignName: "Spring Gala",
    milestoneName: "Save the date",
    thumbnailUrl: null,
    workflowStatus: "assigned_to_me",
    statusDetail: "Due today",
    assigneeName: "Alex",
    assigneeRole: "Communications",
    assigneeInitials: "AL",
    nextAction: "Review and approve",
    nextActionTime: "Today",
    deliveryMethod: "schedule",
    platforms: ["facebook"],
    scheduleAt: null,
    scheduleLabel: null,
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
      captionText: null,
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-07-01T12:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("milestone display names", () => {
  it("rejects channel labels as post names", () => {
    assert.equal(isChannelPostName("Facebook"), true);
    assert.equal(isChannelPostName("Day Before"), false);
    assert.equal(displayApprovalPostName("Facebook"), "Social post");
    assert.equal(displayApprovalPostName("Announcement"), "Announcement");
  });

  it("overlays live Social rename onto approval rows", () => {
    const items = [
      stubItem({
        campaignMilestoneId: "ms-1",
        milestoneName: "Facebook",
      }),
      stubItem({
        id: "item-2",
        campaignMilestoneId: "ms-2",
        milestoneName: "Old Title",
      }),
    ];
    const live = new Map([
      ["ms-1", "Day Before"],
      ["ms-2", "Announcement"],
    ]);

    const named = applyLiveMilestoneNames(items, live);
    assert.equal(named[0]?.milestoneName, "Day Before");
    assert.equal(named[1]?.milestoneName, "Announcement");
  });
});
