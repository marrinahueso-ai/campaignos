export type ApprovalBadgePair = {
  assignedApprovalsCount: number;
  changeRequestsCount: number;
};

/**
 * Merge classic Meta queue counts with Create-with-AI / flyer / newsletter
 * scheduling counts. Matches Approvals hub pulse math (Needs you = sum of
 * in_queue + assigned_to_me across both sources), not max — disjoint flyer
 * and social rows must both appear on the nav badge.
 */
export function mergeApprovalBadgeCounts(
  classic: ApprovalBadgePair,
  scheduling: ApprovalBadgePair,
): ApprovalBadgePair {
  return {
    assignedApprovalsCount:
      classic.assignedApprovalsCount + scheduling.assignedApprovalsCount,
    changeRequestsCount:
      classic.changeRequestsCount + scheduling.changeRequestsCount,
  };
}
