import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  canApproveDraft,
  type CampaignRole,
} from "../../auth/campaign-roles.ts";
import {
  countVisiblePendingSchedulingRows,
  dedupeUnifiedApprovalItems,
  deliveryMethodPatchAfterManualKitSend,
  isSchedulingRowAssignedToActor,
  isSchedulingRowVisibleToActor,
  resolveRowManualEmailSendAt,
  resolveRowMetaScheduleIntent,
} from "../approval-visibility.ts";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalItem,
} from "../types.ts";

/** Mirrors permissions.canActOnUnifiedItem for Node tests (no @/ alias). */
function canActOnUnifiedItem(
  item: UnifiedApprovalItem,
  role: CampaignRole,
): boolean {
  if (canApproveDraft(role)) {
    return true;
  }

  if (
    item.source === "campaign_builder" &&
    !item.hasAssignedUser &&
    (item.workflowStatus === "in_queue" ||
      item.workflowStatus === "assigned_to_me")
  ) {
    return false;
  }

  return item.assignedToMe;
}

function buildRow(
  overrides: Partial<ApprovalSchedulingItemRow> = {},
): ApprovalSchedulingItemRow {
  return {
    id: "sched-1",
    event_id: "evt-1",
    approval_request_id: null,
    communication_item_id: null,
    source: "campaign_builder",
    campaign_milestone_id: "ms-1",
    campaign_name: "Donuts with GrownUps",
    milestone_name: "14 Days Out",
    workflow_status: "in_queue",
    assigned_user_id: null,
    assigned_organization_role_id: null,
    requested_by_user_id: "creator-1",
    delivery_method: "schedule",
    platforms: ["facebook", "instagram"],
    schedule_at: "2026-09-10T14:00:00.000Z",
    caption_text: "Donuts caption",
    story_caption: "Story caption",
    feed_artwork_url: "https://x/donuts-feed.png",
    story_artwork_url: "https://x/donuts-story.png",
    manual_upload_link: null,
    manual_email_to: null,
    manual_email_send_at: null,
    manual_upload_email_sent_at: null,
    notes: null,
    requested_at: "2026-09-01T10:00:00.000Z",
    resolved_at: null,
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

function buildItem(
  overrides: Partial<UnifiedApprovalItem> = {},
): UnifiedApprovalItem {
  return {
    id: "cb2-sched-1",
    source: "campaign_builder",
    eventId: "evt-1",
    eventTitle: "Donuts with GrownUps",
    campaignName: "Donuts with GrownUps",
    milestoneName: "14 Days Out",
    thumbnailUrl: "https://x/donuts-feed.png",
    workflowStatus: "assigned_to_me",
    statusDetail: "Due today",
    assigneeName: "Approver",
    assigneeRole: "VP Communications",
    assigneeInitials: "AP",
    nextAction: "Review and approve",
    nextActionTime: "Submitted 2h ago",
    deliveryMethod: "schedule",
    platforms: ["facebook", "instagram"],
    scheduleAt: "2026-09-10T14:00:00.000Z",
    scheduleLabel: null,
    assignedToMe: true,
    submittedByMe: false,
    hasAssignedUser: true,
    approvalRequestId: null,
    communicationItemId: null,
    schedulingItemId: "sched-1",
    channel: null,
    notes: null,
    preview: {
      captionText: "Donuts caption",
      storyCaptionSnippet: "Story caption",
      feedArtworkUrl: "https://x/donuts-feed.png",
      storyArtworkUrl: "https://x/donuts-story.png",
    },
    requestedAt: "2026-09-01T10:00:00.000Z",
    approvalHistory: [],
    ...overrides,
  };
}

describe("Approval Routing — queue visibility", () => {
  it("1. assigned user sees their pending approval", () => {
    const row = buildRow({
      assigned_user_id: "user-vp",
      workflow_status: "assigned_to_me",
    });
    const actor = {
      organizationUserId: "user-vp",
      organizationRoleId: "role-vp",
    };

    assert.equal(isSchedulingRowAssignedToActor(row, actor), true);
    assert.equal(
      isSchedulingRowVisibleToActor(row, actor, "committee_chair"),
      true,
    );

    const item = buildItem({
      assignedToMe: true,
      hasAssignedUser: true,
      workflowStatus: "assigned_to_me",
    });
    assert.equal(canActOnUnifiedItem(item, "committee_chair"), true);
  });

  it("2. user assigned through organizationRoleId sees the approval", () => {
    const row = buildRow({
      assigned_user_id: null,
      assigned_organization_role_id: "role-vp",
      workflow_status: "in_queue",
    });
    const actor = {
      organizationUserId: "user-on-role",
      organizationRoleId: "role-vp",
    };

    assert.equal(isSchedulingRowAssignedToActor(row, actor), true);
    assert.equal(
      isSchedulingRowVisibleToActor(row, actor, "committee_chair"),
      true,
    );
  });

  it("3. President and VP Communications see all pending approvals", () => {
    const rows = [
      buildRow({ id: "a", assigned_user_id: "someone-else" }),
      buildRow({ id: "b", assigned_user_id: null, workflow_status: "in_queue" }),
    ];
    const actor = {
      organizationUserId: "president-1",
      organizationRoleId: "role-president",
    };

    for (const role of ["president", "vp_communications"] as CampaignRole[]) {
      assert.equal(canApproveDraft(role), true);
      assert.equal(countVisiblePendingSchedulingRows(rows, actor, role), 2);
    }
  });

  it("4. unassigned committee/creator does not receive queue-wide approval access", () => {
    const row = buildRow({
      assigned_user_id: null,
      assigned_organization_role_id: "role-vp",
      workflow_status: "in_queue",
    });
    const creator = {
      organizationUserId: "creator-1",
      organizationRoleId: "role-contributor",
    };

    for (const role of ["committee_chair", "contributor"] as CampaignRole[]) {
      assert.equal(canApproveDraft(role), false);
      assert.equal(isSchedulingRowVisibleToActor(row, creator, role), false);
    }

    const unassignedItem = buildItem({
      assignedToMe: false,
      hasAssignedUser: false,
      workflowStatus: "in_queue",
      source: "campaign_builder",
    });
    assert.equal(canActOnUnifiedItem(unassignedItem, "committee_chair"), false);
    assert.equal(canActOnUnifiedItem(unassignedItem, "contributor"), false);

    const permissionsSource = readFileSync(
      new URL("../permissions.ts", import.meta.url),
      "utf8",
    );
    assert.match(permissionsSource, /canApproveDraft\(role\)/);
    assert.match(permissionsSource, /!item\.hasAssignedUser/);
  });

  it("5. badge count follows the same visibility rules as the queue", () => {
    const rows = [
      buildRow({
        id: "mine",
        assigned_user_id: "user-chair",
        workflow_status: "assigned_to_me",
      }),
      buildRow({
        id: "other",
        assigned_user_id: "user-other",
        workflow_status: "in_queue",
      }),
      buildRow({
        id: "done",
        assigned_user_id: "user-chair",
        workflow_status: "scheduled",
      }),
    ];
    const chair = {
      organizationUserId: "user-chair",
      organizationRoleId: "role-chair",
    };

    assert.equal(
      countVisiblePendingSchedulingRows(rows, chair, "committee_chair"),
      1,
    );
    assert.equal(
      countVisiblePendingSchedulingRows(rows, chair, "president"),
      2,
    );

    const queriesSource = readFileSync(
      new URL("../queries.ts", import.meta.url),
      "utf8",
    );
    assert.match(queriesSource, /isSchedulingRowAssignedToActor/);
    assert.match(queriesSource, /canApproveDraft\(role\)/);
  });
});

describe("Approval Routing — Meta-on-approve and hybrid", () => {
  it("6. approving a valid feed item calls Meta scheduling once", () => {
    const source = readFileSync(
      new URL("../actions.ts", import.meta.url),
      "utf8",
    );
    const calls = source.match(
      /scheduleMetaFeedFromCampaignBuilderApproval\(/g,
    );
    assert.equal(calls?.length, 1);
    assert.match(source, /wantsMetaFeedSchedule: true/);
    assert.match(
      source,
      /updateSchedulingItemStatus\([\s\S]*?scheduleMetaFeedFromCampaignBuilderApproval/,
    );
  });

  it("7. Meta scheduling failure does not reverse approval; returns/logs a clear warning", () => {
    const source = readFileSync(
      new URL("../actions.ts", import.meta.url),
      "utf8",
    );
    assert.match(source, /warning\?: string/);
    assert.match(source, /Approved, but Meta feed scheduling failed:/);
    assert.match(source, /console\.error\(/);
    assert.match(source, /return \{ success: true, warning: metaWarning \}/);
    assert.match(
      source,
      /updateSchedulingItemStatus\([\s\S]*?metaIntent\.wantsMetaFeedSchedule/,
    );
  });

  it("8. hybrid approval preserves Meta scheduling and manual email timing", () => {
    const hybrid = buildRow({
      delivery_method: "schedule",
      feed_artwork_url: "https://x/feed.png",
      manual_email_to: "socials@example.com",
      manual_email_send_at: "2026-09-02T13:00:00.000Z",
      schedule_at: "2026-09-10T14:00:00.000Z",
    });

    const intent = resolveRowMetaScheduleIntent(hybrid);
    assert.equal(intent.wantsMetaFeedSchedule, true);
    assert.equal(intent.storyManual, true);
    assert.equal(intent.feedScheduleAt, "2026-09-10T14:00:00.000Z");
    assert.equal(
      resolveRowManualEmailSendAt(hybrid),
      "2026-09-02T13:00:00.000Z",
    );
    assert.deepEqual(deliveryMethodPatchAfterManualKitSend(true), {});
    assert.deepEqual(deliveryMethodPatchAfterManualKitSend(false), {
      delivery_method: "manual-email",
    });
  });

  it("9. no duplicate approval or Meta schedule record is created", () => {
    const newer = buildItem({
      id: "cb2-new",
      schedulingItemId: "sched-new",
      requestedAt: "2026-09-02T10:00:00.000Z",
      milestoneName: "14 Days Out",
    });
    const olderDup = buildItem({
      id: "cb2-old",
      schedulingItemId: "sched-old",
      requestedAt: "2026-09-01T10:00:00.000Z",
      milestoneName: "14 Days Out",
    });
    const planningShell = buildItem({
      id: "planning-shell",
      schedulingItemId: null,
      milestoneName: "14 Days Out",
      requestedAt: "2026-09-03T10:00:00.000Z",
    });

    const deduped = dedupeUnifiedApprovalItems([
      planningShell,
      olderDup,
      newer,
    ]);
    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.schedulingItemId, "sched-new");

    const metaSource = readFileSync(
      new URL(
        "../../campaign-builder-v2/schedule-meta-from-approval.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const fnStart = metaSource.indexOf(
      "export async function scheduleMetaFeedFromCampaignBuilderApproval",
    );
    const fnBody = metaSource.slice(fnStart, fnStart + 4500);
    assert.match(fnBody, /\.from\("meta_publication_slots"\)/);
    assert.match(fnBody, /\.update\(\{/);
    assert.doesNotMatch(fnBody, /\.insert\(/);
  });
});

describe("Approval Routing — ReviewDrawer preview identity", () => {
  it("10. ReviewDrawer shows the exact artwork and caption tied to the approval item", () => {
    const mapSource = readFileSync(
      new URL("../map-items.ts", import.meta.url),
      "utf8",
    );
    assert.match(
      mapSource,
      /preview:\s*\{\s*captionText: row\.caption_text,\s*storyCaptionSnippet: row\.story_caption,\s*feedArtworkUrl: row\.feed_artwork_url,\s*storyArtworkUrl: row\.story_artwork_url,/s,
    );
    assert.match(
      mapSource,
      /thumbnailUrl: row\.feed_artwork_url \?\? row\.story_artwork_url/,
    );

    const drawer = readFileSync(
      new URL(
        "../../../components/approvals-scheduling/ReviewDrawer.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    assert.match(drawer, /MilestoneContentPreview/);
    assert.match(drawer, /preview=\{item\.preview\}/);
    assert.match(drawer, /milestoneName=\{item\.milestoneName\}/);
  });
});
