import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAssignedApprovalsSchedulingCount, getChangeRequestsSchedulingCount } from "@/lib/approvals-scheduling/queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, sidebarCounts, inboxUnreadCount, cb2AssignedCount, cb2ChangeRequestsCount] =
    await Promise.all([
    getAuthUser(),
    getApprovalSidebarCountsForCurrentUser(),
    getInboxUnreadCountForCurrentOrg(),
    getAssignedApprovalsSchedulingCount(),
    getChangeRequestsSchedulingCount(),
  ]);

  const assignedApprovalsCount = Math.max(
    sidebarCounts.assignedApprovalsCount,
    cb2AssignedCount,
  );

  const changeRequestsCount = Math.max(
    sidebarCounts.changeRequestsCount,
    cb2ChangeRequestsCount,
  );

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={assignedApprovalsCount}
      changeRequestsCount={changeRequestsCount}
      inboxUnreadCount={inboxUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
