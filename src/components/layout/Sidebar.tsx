"use client";

import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Send,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiCreditsWidget } from "@/components/layout/AiCreditsWidget";
import { RalliAiAssistantWidget } from "@/components/layout/RalliAiAssistantWidget";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "campaignos-sidebar-expanded";

const navItems: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/events", icon: Megaphone },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  { label: "Publishing", href: "/publishing", icon: Send },
  { label: "Inbox", href: "/inbox", icon: Inbox },
  { label: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { label: "Insights", href: "/insights", icon: BarChart3 },
];

interface SidebarProps {
  onNavigate?: () => void;
  forceExpanded?: boolean;
  assignedApprovalsCount?: number;
  changeRequestsCount?: number;
  inboxUnreadCount?: number;
}

type NavBadgeVariant = "approval" | "changeRequest";

function NavNotificationBadge({
  count,
  variant,
}: {
  count: number;
  variant: NavBadgeVariant;
}) {
  if (count <= 0) {
    return null;
  }

  const label = count > 99 ? "99+" : String(count);
  const ariaLabel =
    variant === "approval"
      ? `${count} approval${count === 1 ? "" : "s"} waiting`
      : `${count} change request${count === 1 ? "" : "s"} for you`;

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
        variant === "approval"
          ? "bg-red-500 text-white"
          : "bg-cos-change-request text-cos-text",
      )}
    >
      {label}
    </span>
  );
}

function NavNotificationBadges({
  assignedApprovalsCount,
  changeRequestsCount,
}: {
  assignedApprovalsCount: number;
  changeRequestsCount: number;
}) {
  if (assignedApprovalsCount <= 0 && changeRequestsCount <= 0) {
    return null;
  }

  return (
    <span className="flex items-center gap-1">
      <NavNotificationBadge count={assignedApprovalsCount} variant="approval" />
      <NavNotificationBadge count={changeRequestsCount} variant="changeRequest" />
    </span>
  );
}

export function Sidebar({
  onNavigate,
  forceExpanded = false,
  assignedApprovalsCount = 0,
  changeRequestsCount = 0,
  inboxUnreadCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    setReady(true);
  }, []);

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const showLabels = forceExpanded || expanded;
  const showToggle = !forceExpanded && ready;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-cos-border bg-cos-card transition-[width] duration-300 ease-out",
        showLabels ? "w-64" : "w-[4.5rem]",
      )}
    >
      <div
        className={cn(
          "flex h-[4.25rem] items-center border-b border-cos-border",
          showLabels ? "justify-between gap-2 px-3" : "justify-center px-2",
        )}
      >
        <BrandLogo
          href="/"
          variant={showLabels ? "full" : "mark"}
          size={showLabels ? "sidebar" : "md"}
          className={cn(showLabels ? "min-w-0 shrink" : "justify-center")}
          onClick={onNavigate}
        />
        {showToggle && showLabels && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={toggleExpanded}
            className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {showToggle && !showLabels && (
        <div className="flex justify-center py-3">
          <button
            type="button"
            aria-label="Expand sidebar"
            onClick={toggleExpanded}
            className="p-1.5 text-cos-muted transition-colors hover:text-cos-text"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      )}

      <nav className={cn("flex-1 space-y-0.5", showLabels ? "px-4 py-6" : "px-2 py-4")}>
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          const showApprovalBadges = href === "/approvals";
          const showInboxBadge = href === "/inbox";

          return (
            <Link
              key={href}
              href={href}
              title={showLabels ? undefined : label}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center text-sm transition-colors",
                showLabels ? "gap-3 px-3 py-2.5" : "justify-center p-2.5",
                isActive
                  ? "bg-cos-dark text-[#f6f2eb]"
                  : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
              )}
            >
              <span className="relative shrink-0">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {!showLabels && showApprovalBadges && (
                  <span className="absolute -top-2 -right-3 flex flex-col items-end gap-0.5">
                    <NavNotificationBadge
                      count={assignedApprovalsCount}
                      variant="approval"
                    />
                    <NavNotificationBadge
                      count={changeRequestsCount}
                      variant="changeRequest"
                    />
                  </span>
                )}
                {!showLabels && showInboxBadge && (
                  <span className="absolute -top-2 -right-3">
                    <NavNotificationBadge count={inboxUnreadCount} variant="approval" />
                  </span>
                )}
              </span>
              {showLabels && (
                <span className="flex min-w-0 flex-1 items-center gap-2 tracking-wide">
                  <span className="truncate">{label}</span>
                  {badge && (
                    <span className="shrink-0 bg-cos-accent px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-white uppercase">
                      {badge}
                    </span>
                  )}
                  {showApprovalBadges && (
                    <span className="ml-auto">
                      <NavNotificationBadges
                        assignedApprovalsCount={assignedApprovalsCount}
                        changeRequestsCount={changeRequestsCount}
                      />
                    </span>
                  )}
                  {showInboxBadge && (
                    <span className="ml-auto">
                      <NavNotificationBadge count={inboxUnreadCount} variant="approval" />
                    </span>
                  )}
                </span>
              )}
              {!showLabels && (
                <span
                  className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap border border-cos-border bg-cos-card px-2 py-1 text-xs text-cos-text shadow-sm group-hover:block"
                  role="tooltip"
                >
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "space-y-3",
          showLabels ? "px-4 pb-4" : "flex flex-col items-center gap-3 px-2 pb-4",
        )}
      >
        {showLabels ? <RalliAiAssistantWidget /> : <RalliAiAssistantWidget compact />}
        {showLabels ? <AiCreditsWidget /> : <AiCreditsWidget compact />}
      </div>

      {showLabels && (
        <div className="border-t border-cos-border p-5">
          <p className="font-display text-base text-cos-text">ORGANIZE. CREATE. CONNECT.</p>
          <p className="mt-2 text-xs leading-relaxed text-cos-muted">
            Drafts, deadlines, and publishing — organized around your campaign lifecycle.
          </p>
        </div>
      )}
    </aside>
  );
}
