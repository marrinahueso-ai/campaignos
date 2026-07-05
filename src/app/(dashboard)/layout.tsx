import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, sidebarCounts] = await Promise.all([
    getAuthUser(),
    getApprovalSidebarCountsForCurrentUser(),
  ]);

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={sidebarCounts.assignedApprovalsCount}
      changeRequestsCount={sidebarCounts.changeRequestsCount}
    >
      {children}
    </DashboardShell>
  );
}
