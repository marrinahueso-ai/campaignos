import "server-only";

import { getSidebarSchedulingBadgeCounts } from "@/lib/approvals-scheduling/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";
import type { DashboardBadgeCounts } from "@/lib/layout/dashboard-badge-types";

export type { DashboardBadgeCounts };

/**
 * Sidebar badge totals for the dashboard shell.
 * Intended to be started (not awaited) in the layout so the shell + page
 * can stream while these counts resolve.
 */
export async function loadDashboardBadgeCounts(): Promise<DashboardBadgeCounts> {
  const [sidebarCounts, inboxUnreadCount, schedulingBadgeCounts] =
    await Promise.all([
      getApprovalSidebarCountsForCurrentUser(),
      getInboxUnreadCountForCurrentOrg(),
      getSidebarSchedulingBadgeCounts(),
    ]);

  return {
    assignedApprovalsCount: Math.max(
      sidebarCounts.assignedApprovalsCount,
      schedulingBadgeCounts.assignedApprovalsCount,
    ),
    changeRequestsCount: Math.max(
      sidebarCounts.changeRequestsCount,
      schedulingBadgeCounts.changeRequestsCount,
    ),
    inboxUnreadCount,
  };
}
