import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, sidebarCounts, inboxUnreadCount] = await Promise.all([
    getAuthUser(),
    getApprovalSidebarCountsForCurrentUser(),
    getInboxUnreadCountForCurrentOrg(),
  ]);

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={sidebarCounts.assignedApprovalsCount}
      changeRequestsCount={sidebarCounts.changeRequestsCount}
      inboxUnreadCount={inboxUnreadCount}
    >
      {children}
    </DashboardShell>
  );
}
