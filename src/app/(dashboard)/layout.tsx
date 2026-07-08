import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAssignedApprovalsSchedulingCount } from "@/lib/approvals-scheduling/queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, sidebarCounts, inboxUnreadCount, cb2AssignedCount] =
    await Promise.all([
    getAuthUser(),
    getApprovalSidebarCountsForCurrentUser(),
    getInboxUnreadCountForCurrentOrg(),
    getAssignedApprovalsSchedulingCount(),
  ]);

  const assignedApprovalsCount = Math.max(
    sidebarCounts.assignedApprovalsCount,
    cb2AssignedCount,
  );

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={assignedApprovalsCount}
      changeRequestsCount={sidebarCounts.changeRequestsCount}
      inboxUnreadCount={inboxUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
