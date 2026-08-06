import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";

/**
 * Soft caps for Approvals scheduling list fetches.
 * Aligns with Files org/event caps — newest-first ordering keeps recent work.
 */
export const SCHEDULING_ORG_FETCH_CAP = 400;
export const SCHEDULING_EVENT_FETCH_CAP = 200;

/**
 * Org Approvals hub first paint: actionable + failed detail rows only.
 * Scheduled / posted / published stay available via pulse lazy-load so counts
 * remain accurate without serializing every terminal row into the RSC payload.
 */
export const APPROVALS_HUB_INITIAL_WORKFLOW_STATUSES = [
  "in_queue",
  "assigned_to_me",
  "changes_requested",
  "failed",
] as const satisfies readonly UnifiedWorkflowStatus[];

export const APPROVALS_HUB_DEFERRED_WORKFLOW_STATUSES = [
  "scheduled",
  "posted",
  "published",
] as const satisfies readonly UnifiedWorkflowStatus[];

/** Thin index columns for hub pulse/summary/campaigns without full list DTOs. */
export const SCHEDULING_STATUS_INDEX_SELECT = [
  "id",
  "event_id",
  "campaign_name",
  "workflow_status",
  "delivery_method",
].join(", ");
