import type { ApprovalsEasePulseCounts } from "./approvals-ease-pulse.ts";
import {
  isDraftOutcome,
  isPostedOutcome,
} from "./outcome-display.ts";
import type {
  UnifiedDeliveryMethod,
  UnifiedWorkflowStatus,
} from "./types.ts";

/** Minimal scheduling row used to compute hub pulse/summary/campaigns. */
export type SchedulingStatusIndexRow = {
  id: string;
  event_id: string | null;
  campaign_name: string | null;
  workflow_status: UnifiedWorkflowStatus;
  delivery_method: string | null;
};

function asDeliveryMethod(
  value: string | null,
): UnifiedDeliveryMethod | null {
  if (
    value === "publish-now" ||
    value === "auto-publish" ||
    value === "schedule" ||
    value === "manual-email" ||
    value === "draft-only"
  ) {
    return value;
  }
  return null;
}

/**
 * Pulse tab counts from a thin status index (all statuses), so deferred
 * detail rows do not zero out Scheduled / Posted badges.
 */
export function computePulseCountsFromStatusIndex(
  rows: SchedulingStatusIndexRow[],
): ApprovalsEasePulseCounts {
  let needs = 0;
  let scheduled = 0;
  let posted = 0;
  let failed = 0;
  let changes = 0;

  for (const row of rows) {
    const itemLike = {
      workflowStatus: row.workflow_status,
      deliveryMethod: asDeliveryMethod(row.delivery_method),
    };

    switch (row.workflow_status) {
      case "in_queue":
      case "assigned_to_me":
        needs += 1;
        break;
      case "scheduled":
        if (!isDraftOutcome(itemLike)) {
          scheduled += 1;
        }
        break;
      case "posted":
      case "published":
        if (isPostedOutcome(itemLike)) {
          posted += 1;
        }
        break;
      case "failed":
        failed += 1;
        break;
      case "changes_requested":
        changes += 1;
        break;
      default:
        break;
    }
  }

  return { needs, scheduled, posted, failed, changes };
}

export function summarizeStatusIndex(
  rows: SchedulingStatusIndexRow[],
): {
  inQueue: number;
  assignedToMe: number;
  scheduled: number;
  posted: number;
  published: number;
  failed: number;
  changesRequested: number;
} {
  const summary = {
    inQueue: 0,
    assignedToMe: 0,
    scheduled: 0,
    posted: 0,
    published: 0,
    failed: 0,
    changesRequested: 0,
  };

  for (const row of rows) {
    switch (row.workflow_status) {
      case "in_queue":
        summary.inQueue += 1;
        break;
      case "assigned_to_me":
        summary.assignedToMe += 1;
        break;
      case "scheduled":
        summary.scheduled += 1;
        break;
      case "posted":
        summary.posted += 1;
        break;
      case "published":
        summary.published += 1;
        break;
      case "failed":
        summary.failed += 1;
        break;
      case "changes_requested":
        summary.changesRequested += 1;
        break;
      default:
        break;
    }
  }

  return summary;
}

export function campaignsFromStatusIndex(
  rows: SchedulingStatusIndexRow[],
): Array<{ id: string; title: string }> {
  const byId = new Map<string, string>();
  for (const row of rows) {
    if (!row.event_id) continue;
    if (!byId.has(row.event_id) && row.campaign_name) {
      byId.set(row.event_id, row.campaign_name);
    } else if (!byId.has(row.event_id)) {
      byId.set(row.event_id, "Campaign");
    }
  }
  return [...byId.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((left, right) => left.title.localeCompare(right.title));
}
