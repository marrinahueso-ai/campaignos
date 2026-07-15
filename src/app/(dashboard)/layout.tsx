import { DashboardShell } from "@/components/layout/DashboardShell";
import { ReportProblemHost } from "@/components/monitoring/ReportProblemHost";
import { getSidebarSchedulingBadgeCounts } from "@/lib/approvals-scheduling/queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, sidebarCounts, inboxUnreadCount, schedulingBadgeCounts] =
    await Promise.all([
      getAuthUser(),
      getApprovalSidebarCountsForCurrentUser(),
      getInboxUnreadCountForCurrentOrg(),
      getSidebarSchedulingBadgeCounts(),
    ]);

  const assignedApprovalsCount = Math.max(
    sidebarCounts.assignedApprovalsCount,
    schedulingBadgeCounts.assignedApprovalsCount,
  );

  const changeRequestsCount = Math.max(
    sidebarCounts.changeRequestsCount,
    schedulingBadgeCounts.changeRequestsCount,
  );

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={assignedApprovalsCount}
      changeRequestsCount={changeRequestsCount}
      inboxUnreadCount={inboxUnreadCount}
    >
      {children}
      <ReportProblemHost />
    </DashboardShell>
  );
}
