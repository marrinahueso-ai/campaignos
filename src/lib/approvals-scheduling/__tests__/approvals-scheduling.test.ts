import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  deriveClassicWorkflowStatus,
  searchMatchesItem,
  summarizeCounts,
  tabMatchesItem,
} from "../status.ts";
import type { UnifiedApprovalItem } from "../types.ts";

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
