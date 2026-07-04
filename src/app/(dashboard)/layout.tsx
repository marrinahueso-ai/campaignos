import { DashboardShell } from "@/components/layout/DashboardShell";
import { getAuthUser } from "@/lib/auth/queries";
import { getAssignedApprovalsCountForCurrentUser } from "@/lib/event-workspace/approval-routing-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, assignedApprovalsCount] = await Promise.all([
    getAuthUser(),
    getAssignedApprovalsCountForCurrentUser(),
  ]);

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      assignedApprovalsCount={assignedApprovalsCount}
    >
      {children}
    </DashboardShell>
  );
}
