import {
  canApproveDraft,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type {
  UnifiedApprovalItem,
  UnifiedViewScope,
  UnifiedWorkflowStatus,
} from "@/lib/approvals-scheduling/types";

/** Statuses where Approve / Request changes are valid actions. */
export const ACTIONABLE_APPROVAL_STATUSES: ReadonlySet<UnifiedWorkflowStatus> =
  new Set(["in_queue", "assigned_to_me", "changes_requested"]);

/** Sync helper for client props — server data should set canViewAll from EffectiveAccess. */
export function canViewAllApprovals(role: CampaignRole): boolean {
  return canApproveDraft(role);
}

export function filterItemsByViewScope(
  items: UnifiedApprovalItem[],
  scope: UnifiedViewScope,
  canViewAll: boolean,
): UnifiedApprovalItem[] {
  if (scope === "all" && canViewAll) {
    return items;
  }

  return items.filter((item) => item.assignedToMe || item.submittedByMe);
}

export function canActOnUnifiedItem(
  item: UnifiedApprovalItem,
  roleOrCanApprove: CampaignRole | boolean,
): boolean {
  // Already approved / posted — read-only until changes are requested and
  // the creator resubmits into an actionable status.
  if (!ACTIONABLE_APPROVAL_STATUSES.has(item.workflowStatus)) {
    return false;
  }

  // Presidents / VPs / admins can approve from the queue even before an
  // individual assignee is set (in_queue). Non-approvers still need assignment.
  const canApprove =
    typeof roleOrCanApprove === "boolean"
      ? roleOrCanApprove
      : canApproveDraft(roleOrCanApprove);
  if (canApprove) {
    return true;
  }

  if (
    item.source === "campaign_builder" &&
    !item.hasAssignedUser &&
    (item.workflowStatus === "in_queue" || item.workflowStatus === "assigned_to_me")
  ) {
    return false;
  }

  return item.assignedToMe;
}

export function canReassignUnifiedItem(role: CampaignRole): boolean {
  return canApproveDraft(role);
}
