import {
  canApproveDraft,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import type {
  UnifiedApprovalItem,
  UnifiedViewScope,
} from "@/lib/approvals-scheduling/types";

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
  role: CampaignRole,
): boolean {
  if (
    item.source === "campaign_builder" &&
    !item.hasAssignedUser &&
    (item.workflowStatus === "in_queue" || item.workflowStatus === "assigned_to_me")
  ) {
    return false;
  }

  if (canApproveDraft(role)) {
    return true;
  }

  return item.assignedToMe;
}

export function canReassignUnifiedItem(role: CampaignRole): boolean {
  return canApproveDraft(role);
}
