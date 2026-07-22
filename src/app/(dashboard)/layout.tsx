import { DashboardShell } from "@/components/layout/DashboardShell";
import { ReportProblemHost } from "@/components/monitoring/ReportProblemHost";
import { getSidebarSchedulingBadgeCounts } from "@/lib/approvals-scheduling/queries";
import { normalizeOrganizationId } from "@/lib/auth/active-organization";
import {
  getActiveMembership,
  listActiveMemberships,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { getApprovalSidebarCountsForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";
import { getInboxUnreadCountForCurrentOrg } from "@/lib/inbox/queries";
import { canAccessOwnerOps } from "@/lib/ops/access";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    user,
    sidebarCounts,
    inboxUnreadCount,
    schedulingBadgeCounts,
    organizations,
    activeMembership,
    showOwnerOps,
  ] = await Promise.all([
    getAuthUser(),
    getApprovalSidebarCountsForCurrentUser(),
    getInboxUnreadCountForCurrentOrg(),
    getSidebarSchedulingBadgeCounts(),
    listActiveMemberships(),
    getActiveMembership(),
    canAccessOwnerOps(),
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
      organizations={organizations}
      activeOrganizationId={
        normalizeOrganizationId(activeMembership?.organizationId) ?? null
      }
      showOwnerOps={showOwnerOps}
    >
      {children}
      <ReportProblemHost />
    </DashboardShell>
  );
}
