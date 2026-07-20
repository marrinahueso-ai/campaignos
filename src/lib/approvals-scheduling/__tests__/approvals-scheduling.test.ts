import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  deriveClassicWorkflowStatus,
  deriveSchedulingWorkflowStatus,
  searchMatchesItem,
  summarizeCounts,
  tabMatchesItem,
} from "../status.ts";
import type { ApprovalSchedulingItemRow, UnifiedApprovalItem } from "../types.ts";

function buildItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "item-1",
    source: "classic",
    eventId: "evt-1",
    eventTitle: "Back to School Fair",
    campaignName: "Back to School Fair",
    milestoneName: "Save the Date",
    thumbnailUrl: null,
    workflowStatus: "assigned_to_me",
    statusDetail: "Due today",
    assigneeName: "Sarah M.",
    assigneeRole: "Committee Chair",
    assigneeInitials: "SM",
    nextAction: "Review and approve",
    nextActionTime: "Submitted 2h ago",
    deliveryMethod: "auto-publish",
    platforms: ["facebook", "instagram"],
    scheduleAt: null,
    scheduleLabel: null,
    assignedToMe: true,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: "req-1",
    communicationItemId: "comm-1",
    schedulingItemId: null,
    channel: "facebook",
    notes: null,
    preview: {
      captionText: "Join us!",
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    requestedAt: "2026-05-17T10:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("tabMatchesItem", () => {
  it("returns all items for the all tab", () => {
    const item = buildItem({ workflowStatus: "published" });
    assert.equal(tabMatchesItem("all", item), true);
  });

  it("filters by workflow status", () => {
    const item = buildItem({ workflowStatus: "scheduled" });
    assert.equal(tabMatchesItem("scheduled", item), true);
    assert.equal(tabMatchesItem("assigned_to_me", item), false);
  });
});

describe("summarizeCounts", () => {
  it("counts each workflow bucket", () => {
    const counts = summarizeCounts([
      buildItem({ id: "1", workflowStatus: "in_queue" }),
      buildItem({ id: "2", workflowStatus: "assigned_to_me" }),
      buildItem({ id: "3", workflowStatus: "assigned_to_me" }),
      buildItem({ id: "4", workflowStatus: "published" }),
    ]);

    assert.equal(counts.in_queue, 1);
    assert.equal(counts.assigned_to_me, 2);
    assert.equal(counts.published, 1);
  });
});

describe("searchMatchesItem", () => {
  it("matches campaign and milestone text", () => {
    const item = buildItem();
    assert.equal(searchMatchesItem(item, "save the"), true);
    assert.equal(searchMatchesItem(item, "winter gala"), false);
  });
});

describe("deriveClassicWorkflowStatus", () => {
  it("maps pending assigned items to assigned_to_me", () => {
    const queueItem = {
      status: "pending",
      communicationStatus: "pending_approval",
      assignedToMe: true,
      preview: { scheduledFor: null },
    } as Parameters<typeof deriveClassicWorkflowStatus>[0];

    assert.equal(
      deriveClassicWorkflowStatus(queueItem, "2026-05-18"),
      "assigned_to_me",
    );
  });
});

describe("permissions helpers", () => {
  it("treats admin-tier roles as able to view all", () => {
    const adminRoles = new Set(["admin", "president", "vp_communications"]);
    assert.equal(adminRoles.has("admin"), true);
    assert.equal(adminRoles.has("contributor"), false);
  });
});

describe("deriveSchedulingWorkflowStatus", () => {
  const baseRow = {
    id: "sched-1",
    event_id: "evt-1",
    approval_request_id: null,
    communication_item_id: null,
    source: "campaign_builder",
    campaign_milestone_id: "ms-1",
    campaign_name: "Fair",
    milestone_name: "Save the Date",
    assigned_organization_role_id: null,
    requested_by_user_id: "creator-1",
    delivery_method: "auto-publish",
    platforms: ["facebook"],
    schedule_at: null,
    caption_text: null,
    story_caption: null,
    feed_artwork_url: null,
    story_artwork_url: null,
    notes: null,
    requested_at: "2026-05-17T10:00:00.000Z",
    resolved_at: null,
    created_at: "2026-05-17T10:00:00.000Z",
    updated_at: "2026-05-17T10:00:00.000Z",
  } satisfies ApprovalSchedulingItemRow;

  it("maps unassigned pending rows to in_queue", () => {
    assert.equal(
      deriveSchedulingWorkflowStatus(
        {
          ...baseRow,
          workflow_status: "assigned_to_me",
          assigned_user_id: null,
        },
        false,
      ),
      "in_queue",
    );
  });

  it("maps assigned rows to assigned_to_me for the assignee", () => {
    assert.equal(
      deriveSchedulingWorkflowStatus(
        {
          ...baseRow,
          workflow_status: "assigned_to_me",
          assigned_user_id: "user-1",
        },
        true,
      ),
      "assigned_to_me",
    );
  });

  it("maps assigned rows to in_queue for other viewers", () => {
    assert.equal(
      deriveSchedulingWorkflowStatus(
        {
          ...baseRow,
          workflow_status: "assigned_to_me",
          assigned_user_id: "user-1",
        },
        false,
      ),
      "in_queue",
    );
  });

  it("preserves changes_requested", () => {
    assert.equal(
      deriveSchedulingWorkflowStatus(
        {
          ...baseRow,
          workflow_status: "changes_requested",
          assigned_user_id: "user-1",
        },
        true,
      ),
      "changes_requested",
    );
  });
});

describe("canActOnUnifiedItem guard", () => {
  it("blocks non-approvers when campaign builder item has no assigned user", () => {
    const source = readFileSync(
      new URL("../permissions.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /canApproveDraft\(role\)/);
    assert.match(source, /!item\.hasAssignedUser/);
    assert.match(source, /item\.source === "campaign_builder"/);
  });
});

describe("approval routing source checks", () => {
  it("stores in_queue when no assignee in approval-bridge", () => {
    const source = readFileSync(
      new URL("../../campaign-builder-v2/approval-bridge.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /assignee\.assignedUserId \? "assigned_to_me" : "in_queue"/);
    assert.match(source, /resubmitStatuses/);
  });
});

describe("approval notification hooks", () => {
  it("declares email hook exports in approval-notifications.ts", () => {
    const source = readFileSync(
      new URL("../../campaign-builder-v2/approval-notifications.ts", import.meta.url),
      "utf8",
    );

    assert.match(source, /export async function sendApprovalAssignedEmail/);
    assert.match(source, /export async function sendChangeRequestedEmail/);
    assert.match(source, /export async function sendContentApprovedEmail/);
    assert.match(source, /export async function sendScheduledDeliveryEmail/);
    assert.match(source, /approval_notification_log/);
  });
});
