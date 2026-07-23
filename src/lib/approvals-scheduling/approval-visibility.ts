/**
 * Pure Approval Routing visibility helpers.
 * Shared by Approvals hub queries, badge counts, and regression tests.
 */

import type { CampaignRole } from "../auth/campaign-roles.ts";
import { canApproveDraft } from "../auth/campaign-roles.ts";
import { milestoneNameMatchKey } from "../campaign-builder-v2/milestone-names.ts";
import type {
  ApprovalSchedulingItemRow,
  UnifiedApprovalItem,
} from "./types.ts";

export type ApprovalVisibilityActor = {
  organizationUserId: string | null;
  organizationRoleId: string | null;
};

export function isSchedulingRowAssignedToActor(
  row: Pick<
    ApprovalSchedulingItemRow,
    "assigned_user_id" | "assigned_organization_role_id"
  >,
  actor: ApprovalVisibilityActor | null,
): boolean {
  if (!actor?.organizationUserId) {
    return false;
  }

  if (row.assigned_user_id === actor.organizationUserId) {
    return true;
  }

  return Boolean(
    actor.organizationRoleId &&
      row.assigned_organization_role_id === actor.organizationRoleId,
  );
}

export function isPendingSchedulingRow(
  row: Pick<ApprovalSchedulingItemRow, "workflow_status">,
): boolean {
  return (
    row.workflow_status === "assigned_to_me" ||
    row.workflow_status === "in_queue"
  );
}

/**
 * Badge + queue visibility for Create with AI scheduling rows.
 * Approvers (president / VP / admin) see all pending; others only assigned rows.
 */
export function isSchedulingRowVisibleToActor(
  row: ApprovalSchedulingItemRow,
  actor: ApprovalVisibilityActor | null,
  role: CampaignRole,
): boolean {
  if (!isPendingSchedulingRow(row)) {
    return false;
  }

  if (canApproveDraft(role)) {
    return true;
  }

  return isSchedulingRowAssignedToActor(row, actor);
}

export function countVisiblePendingSchedulingRows(
  rows: ApprovalSchedulingItemRow[],
  actor: ApprovalVisibilityActor | null,
  role: CampaignRole,
): number {
  return rows.filter((row) => isSchedulingRowVisibleToActor(row, actor, role))
    .length;
}

/** Prefer CB2 rows; drop Meta planning shells when the same milestone already exists. */
export function dedupeUnifiedApprovalItems(
  items: UnifiedApprovalItem[],
): UnifiedApprovalItem[] {
  const seenCommunicationIds = new Set<string>();
  const seenSchedulingIds = new Set<string>();
  const seenCb2EventMilestoneKeys = new Set<string>();
  const cb2EventMilestoneKeys = new Set(
    items
      .filter((item) => Boolean(item.schedulingItemId))
      .map(
        (item) =>
          `${item.eventId}:${milestoneNameMatchKey(item.milestoneName)}`,
      ),
  );
  const result: UnifiedApprovalItem[] = [];

  const ordered = [...items].sort((left, right) => {
    const leftCb2 = Boolean(left.schedulingItemId);
    const rightCb2 = Boolean(right.schedulingItemId);
    if (leftCb2 !== rightCb2) {
      return leftCb2 ? -1 : 1;
    }
    if (leftCb2 && rightCb2) {
      return right.requestedAt.localeCompare(left.requestedAt);
    }
    return 0;
  });

  for (const item of ordered) {
    if (item.communicationItemId) {
      if (seenCommunicationIds.has(item.communicationItemId)) {
        continue;
      }
      seenCommunicationIds.add(item.communicationItemId);
    }

    if (item.schedulingItemId) {
      if (seenSchedulingIds.has(item.schedulingItemId)) {
        continue;
      }
      seenSchedulingIds.add(item.schedulingItemId);

      const cb2Key = `${item.eventId}:${milestoneNameMatchKey(item.milestoneName)}`;
      if (seenCb2EventMilestoneKeys.has(cb2Key)) {
        continue;
      }
      seenCb2EventMilestoneKeys.add(cb2Key);
    }

    const isPlanningShell = item.id.startsWith("planning-");
    if (isPlanningShell) {
      const key = `${item.eventId}:${milestoneNameMatchKey(item.milestoneName)}`;
      if (cb2EventMilestoneKeys.has(key)) {
        continue;
      }
    }

    result.push(item);
  }

  return result;
}

/** Row-level Meta intent when CB2 session preview is unavailable. */
export function resolveRowMetaScheduleIntent(
  row: Pick<
    ApprovalSchedulingItemRow,
    "delivery_method" | "manual_email_to" | "feed_artwork_url" | "schedule_at"
  >,
): {
  wantsMetaFeedSchedule: boolean;
  storyManual: boolean;
  feedScheduleAt: string | null;
} {
  const storyManual =
    row.delivery_method === "manual-email" ||
    Boolean(row.manual_email_to?.trim());
  const wantsMetaFeedSchedule =
    Boolean(row.feed_artwork_url?.trim()) &&
    (row.delivery_method === "schedule" ||
      row.delivery_method === "auto-publish" ||
      row.delivery_method === "publish-now");

  return {
    wantsMetaFeedSchedule,
    storyManual,
    feedScheduleAt: row.schedule_at,
  };
}

export function resolveRowManualEmailSendAt(
  row: Pick<
    ApprovalSchedulingItemRow,
    "manual_email_send_at" | "schedule_at"
  >,
): string | null {
  return row.manual_email_send_at ?? row.schedule_at ?? null;
}

/** After story-kit send on approve: keep schedule when Meta feed was also scheduled. */
export function deliveryMethodPatchAfterManualKitSend(
  wantsMetaFeedSchedule: boolean,
): { delivery_method: "manual-email" } | Record<string, never> {
  return wantsMetaFeedSchedule ? {} : { delivery_method: "manual-email" };
}
