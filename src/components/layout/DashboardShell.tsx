"use client";

import { Suspense, use, useState } from "react";
import { ChunkLoadRecovery } from "@/components/layout/ChunkLoadRecovery";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import type { ActiveOrganizationOption } from "@/lib/auth/active-organization";
import type { DashboardBadgeCounts } from "@/lib/layout/dashboard-badge-types";
import type { AiCreditsWidgetData } from "@/lib/ai/ai-credits-widget-data";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  /** @deprecated Prefer badgeCountsPromise so layout can stream counts. */
  assignedApprovalsCount?: number;
  /** @deprecated Prefer badgeCountsPromise so layout can stream counts. */
  changeRequestsCount?: number;
  /** @deprecated Prefer badgeCountsPromise so layout can stream counts. */
  inboxUnreadCount?: number;
  /** When set, sidebar badges resolve without blocking main content. */
  badgeCountsPromise?: Promise<DashboardBadgeCounts>;
  organizations?: ActiveOrganizationOption[];
  activeOrganizationId?: string | null;
  showOwnerOps?: boolean;
  aiCredits?: AiCreditsWidgetData | null;
  /** Streams the sidebar-only balance instead of blocking every dashboard page. */
  aiCreditsPromise?: Promise<AiCreditsWidgetData | null>;
}

function SidebarWithBadgePromise({
  badgeCountsPromise,
  activeOrganizationId,
  showOwnerOps,
  aiCredits,
  aiCreditsPromise,
  forceExpanded,
  onNavigate,
}: {
  badgeCountsPromise: Promise<DashboardBadgeCounts>;
  activeOrganizationId: string | null;
  showOwnerOps: boolean;
  aiCredits?: AiCreditsWidgetData | null;
  aiCreditsPromise?: Promise<AiCreditsWidgetData | null>;
  forceExpanded?: boolean;
  onNavigate?: () => void;
}) {
  const counts = use(badgeCountsPromise);
  const resolvedAiCredits = aiCreditsPromise ? use(aiCreditsPromise) : aiCredits;
  return (
    <Sidebar
      assignedApprovalsCount={counts.assignedApprovalsCount}
      changeRequestsCount={counts.changeRequestsCount}
      inboxUnreadCount={counts.inboxUnreadCount}
      activeOrganizationId={activeOrganizationId}
      showOwnerOps={showOwnerOps}
      aiCredits={resolvedAiCredits}
      forceExpanded={forceExpanded}
      onNavigate={onNavigate}
    />
  );
}

function ShellSidebar({
  badgeCountsPromise,
  assignedApprovalsCount,
  changeRequestsCount,
  inboxUnreadCount,
  activeOrganizationId,
  showOwnerOps,
  aiCredits,
  aiCreditsPromise,
  forceExpanded,
  onNavigate,
}: {
  badgeCountsPromise?: Promise<DashboardBadgeCounts>;
  assignedApprovalsCount: number;
  changeRequestsCount: number;
  inboxUnreadCount: number;
  activeOrganizationId: string | null;
  showOwnerOps: boolean;
  aiCredits?: AiCreditsWidgetData | null;
  aiCreditsPromise?: Promise<AiCreditsWidgetData | null>;
  forceExpanded?: boolean;
  onNavigate?: () => void;
}) {
  const fallback = (
    <Sidebar
      assignedApprovalsCount={assignedApprovalsCount}
      changeRequestsCount={changeRequestsCount}
      inboxUnreadCount={inboxUnreadCount}
      activeOrganizationId={activeOrganizationId}
      showOwnerOps={showOwnerOps}
      aiCredits={aiCredits}
      forceExpanded={forceExpanded}
      onNavigate={onNavigate}
    />
  );

  if (!badgeCountsPromise) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <SidebarWithBadgePromise
        badgeCountsPromise={badgeCountsPromise}
        activeOrganizationId={activeOrganizationId}
        showOwnerOps={showOwnerOps}
        aiCredits={aiCredits}
        aiCreditsPromise={aiCreditsPromise}
        forceExpanded={forceExpanded}
        onNavigate={onNavigate}
      />
    </Suspense>
  );
}

export function DashboardShell({
  children,
  userEmail,
  assignedApprovalsCount = 0,
  changeRequestsCount = 0,
  inboxUnreadCount = 0,
  badgeCountsPromise,
  organizations = [],
  activeOrganizationId = null,
  showOwnerOps = false,
  aiCredits = null,
  aiCreditsPromise,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cos-bg">
      <ChunkLoadRecovery />
      <div className="hidden shrink-0 lg:block">
        <ShellSidebar
          badgeCountsPromise={badgeCountsPromise}
          assignedApprovalsCount={assignedApprovalsCount}
          changeRequestsCount={changeRequestsCount}
          inboxUnreadCount={inboxUnreadCount}
          activeOrganizationId={activeOrganizationId}
          showOwnerOps={showOwnerOps}
          aiCredits={aiCredits}
          aiCreditsPromise={aiCreditsPromise}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-cos-dark/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72">
            <ShellSidebar
              badgeCountsPromise={badgeCountsPromise}
              assignedApprovalsCount={assignedApprovalsCount}
              changeRequestsCount={changeRequestsCount}
              inboxUnreadCount={inboxUnreadCount}
              activeOrganizationId={activeOrganizationId}
              showOwnerOps={showOwnerOps}
              aiCredits={aiCredits}
              aiCreditsPromise={aiCreditsPromise}
              forceExpanded
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          userEmail={userEmail}
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((open) => !open)}
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
        />

        <main className="flex-1 px-4 py-8 lg:px-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
