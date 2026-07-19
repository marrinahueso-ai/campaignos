"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import type { ActiveOrganizationOption } from "@/lib/auth/active-organization";

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
  assignedApprovalsCount?: number;
  changeRequestsCount?: number;
  inboxUnreadCount?: number;
  organizations?: ActiveOrganizationOption[];
  activeOrganizationId?: string | null;
}

export function DashboardShell({
  children,
  userEmail,
  assignedApprovalsCount = 0,
  changeRequestsCount = 0,
  inboxUnreadCount = 0,
  organizations = [],
  activeOrganizationId = null,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cos-bg">
      <div className="hidden shrink-0 lg:block">
        <Sidebar
          assignedApprovalsCount={assignedApprovalsCount}
          changeRequestsCount={changeRequestsCount}
          inboxUnreadCount={inboxUnreadCount}
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
            <Sidebar
              forceExpanded
              assignedApprovalsCount={assignedApprovalsCount}
              changeRequestsCount={changeRequestsCount}
              inboxUnreadCount={inboxUnreadCount}
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
