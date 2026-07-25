import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ReportProblemHost } from "@/components/monitoring/ReportProblemHost";
import { normalizeOrganizationId } from "@/lib/auth/active-organization";
import {
  getActiveMembership,
  listActiveMemberships,
} from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
import { loadDashboardBadgeCounts } from "@/lib/layout/dashboard-badge-counts";
import { canAccessOwnerOps } from "@/lib/ops/access";
import { getOrgAiCreditsWidgetData } from "@/lib/ai/credits";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth / org switcher only — badge counts stream via Suspense so they do not
  // block the shell or page body (Calendar, Tasks, Approvals, Dashboard, …).
  const [user, organizations, activeMembership, showOwnerOps] =
    await Promise.all([
      getAuthUser(),
      listActiveMemberships(),
      getActiveMembership(),
      canAccessOwnerOps(),
    ]);

  const activeOrganizationId =
    normalizeOrganizationId(activeMembership?.organizationId) ?? null;

  const aiCredits = await getOrgAiCreditsWidgetData(activeOrganizationId);
  const badgeCountsPromise = loadDashboardBadgeCounts();

  return (
    <DashboardShell
      userEmail={user?.email ?? null}
      badgeCountsPromise={badgeCountsPromise}
      organizations={organizations}
      activeOrganizationId={activeOrganizationId}
      showOwnerOps={showOwnerOps}
      aiCredits={aiCredits}
    >
      {children}
      <Suspense fallback={null}>
        <ReportProblemHost />
      </Suspense>
    </DashboardShell>
  );
}
