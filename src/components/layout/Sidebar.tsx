"use client";

import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Shield,
  Store,
  Users,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { AiCreditsWidget } from "@/components/layout/AiCreditsWidget";
import { RalliAiAssistantWidget } from "@/components/layout/RalliAiAssistantWidget";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from "react";
import {
  getLocationHash,
  subscribeToLocationHash,
} from "@/lib/navigation/location-hash";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { dispatchCommunicationsHubReset } from "@/lib/communications-hub/events";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "campaignos-sidebar-expanded";
const LAST_EVENT_STORAGE_KEY = "campaignos-last-event-id";

const lastEventIdListeners = new Set<() => void>();

function subscribeToLastEventId(onStoreChange: () => void): () => void {
  lastEventIdListeners.add(onStoreChange);
  return () => {
    lastEventIdListeners.delete(onStoreChange);
  };
}

function notifyLastEventIdListeners(): void {
  for (const listener of lastEventIdListeners) {
    listener();
  }
}

function lastEventStorageKey(organizationId: string | null | undefined): string {
  if (!organizationId) {
    return LAST_EVENT_STORAGE_KEY;
  }
  return `${LAST_EVENT_STORAGE_KEY}:${organizationId}`;
}

function readLastEventId(organizationId: string | null | undefined): string | null {
  if (typeof window === "undefined" || !organizationId) {
    return null;
  }
  return localStorage.getItem(lastEventStorageKey(organizationId));
}

function writeLastEventId(
  organizationId: string | null | undefined,
  eventId: string,
): void {
  if (!organizationId) {
    return;
  }
  localStorage.setItem(lastEventStorageKey(organizationId), eventId);
  notifyLastEventIdListeners();
}

const CREATIVE_STUDIO_HASHES = new Set([
  "social-media",
  "plan",
  "communication-plan",
  "artwork",
  "creative",
  "schedule",
  "captions",
  "timeline",
  "publish",
  "published",
  "approval",
  "approvals",
  "publishing",
  "drafts-messages",
  "event-assets",
  "memory",
  "activity",
  "notes-memory",
]);

function extractEventId(pathname: string): string | null {
  const match = pathname.match(/^\/events\/([^/]+)(?:\/campaign-builder)?$/);
  if (!match || match[1] === "create") {
    return null;
  }
  return match[1];
}

const CAMPAIGN_BUILDER_HASH = "inspiration";

function extractCampaignBuilderEventId(pathname: string): string | null {
  const match = pathname.match(/^\/events\/([^/]+)\/campaign-builder$/);
  if (!match || match[1] === "create") {
    return null;
  }
  return match[1];
}

function resolveCampaignBuilderHref(
  pathname: string,
  lastEventId: string | null,
): string {
  const eventId =
    extractCampaignBuilderEventId(pathname) ?? extractEventId(pathname);
  if (eventId) {
    return `/events/${eventId}/campaign-builder#${CAMPAIGN_BUILDER_HASH}`;
  }
  if (lastEventId) {
    return `/events/${lastEventId}/campaign-builder#${CAMPAIGN_BUILDER_HASH}`;
  }
  // Hub page — works with zero events and respects access there.
  return "/create-with-ai";
}

function handleCampaignBuilderClick(
  event: MouseEvent<HTMLAnchorElement>,
  linkHref: string,
) {
  event.preventDefault();

  const [pathPart, hashPart = CAMPAIGN_BUILDER_HASH] = linkHref.split("#");
  const hash = hashPart.replace(/^#/, "");
  const targetEventId = extractCampaignBuilderEventId(pathPart);

  if (pathPart === "/create-with-ai" || (pathPart === "/events" && !targetEventId)) {
    window.location.assign("/create-with-ai");
    return;
  }

  window.location.assign(`${pathPart}#${hash}`);
}

function isCampaignBuilderActive(pathname: string, _hash: string): boolean {
  return (
    pathname === "/create-with-ai" ||
    pathname.startsWith("/create-with-ai/") ||
    extractCampaignBuilderEventId(pathname) !== null
  );
}

function isCreativeStudioActive(pathname: string, hash: string): boolean {
  if (isCampaignBuilderActive(pathname, hash)) {
    return false;
  }

  const eventId = extractEventId(pathname);
  if (!eventId) {
    return false;
  }

  const raw = hash.replace("#", "");
  if (!raw) {
    return false;
  }

  return CREATIVE_STUDIO_HASHES.has(raw);
}

function isCampaignsActive(pathname: string, hash: string): boolean {
  if (isCampaignBuilderActive(pathname, hash)) {
    return false;
  }
  if (pathname === "/events" || pathname.startsWith("/events?")) {
    return true;
  }
  if (pathname === "/events/create") {
    return true;
  }

  const eventId = extractEventId(pathname);
  if (eventId) {
    return !isCreativeStudioActive(pathname, hash);
  }

  return pathname.startsWith("/events");
}

function isCommunicationsHubActive(pathname: string): boolean {
  return pathname === "/communications" || pathname === "/inbox";
}

const navItems: {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  resolveHref?: (pathname: string, lastEventId: string | null) => string;
  isActive?: (pathname: string, hash: string) => boolean;
}[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/calendar", icon: CalendarRange },
  {
    label: "Events",
    href: "/events",
    icon: Megaphone,
    isActive: isCampaignsActive,
  },
  {
    label: "Volunteers",
    href: "/volunteers",
    icon: Users,
    isActive: (pathname) => pathname.startsWith("/volunteers"),
  },
  ...(isCampaignBuilderV2Enabled()
    ? [
        {
          label: "Create with AI",
          href: "/create-with-ai",
          icon: WandSparkles,
          resolveHref: resolveCampaignBuilderHref,
          isActive: isCampaignBuilderActive,
        } as const,
      ]
    : []),
  { label: "Approvals", href: "/approvals", icon: CheckCircle2 },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  {
    label: "Communications Hub",
    href: "/communications",
    icon: Inbox,
    isActive: isCommunicationsHubActive,
  },
  { label: "Files", href: "/files", icon: FolderOpen },
  { label: "Vendors", href: "/vendors", icon: Store },
  { label: "Insights", href: "/insights", icon: BarChart3 },
];

interface SidebarProps {
  onNavigate?: () => void;
  forceExpanded?: boolean;
  assignedApprovalsCount?: number;
  changeRequestsCount?: number;
  inboxUnreadCount?: number;
  /** Scopes "last event" for Create with AI so orgs never share ids. */
  activeOrganizationId?: string | null;
  /** Hey Ralli platform owner ops link. */
  showOwnerOps?: boolean;
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
  activeOrganizationId = null,
  showOwnerOps = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);
  const ownerSectionActive = pathname === "/ops" || pathname.startsWith("/ops/");
  const [ownerOpsOpen, setOwnerOpsOpen] = useState(ownerSectionActive);
  const locationHash = useSyncExternalStore(
    subscribeToLocationHash,
    getLocationHash,
    () => "",
  );
  const lastEventId = useSyncExternalStore(
    subscribeToLastEventId,
    () => readLastEventId(activeOrganizationId),
    () => null,
  );

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setExpanded(true);
    setReady(true);
  }, []);

  useEffect(() => {
    if (ownerSectionActive) setOwnerOpsOpen(true);
  }, [ownerSectionActive]);

  useEffect(() => {
    notifyLastEventIdListeners();
  }, [activeOrganizationId]);

  useEffect(() => {
    const eventId = extractEventId(pathname);
    if (eventId) {
      writeLastEventId(activeOrganizationId, eventId);
    }
  }, [pathname, activeOrganizationId]);

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

      {/* Scrollable primary nav; Ask Ralli renders immediately after Insights. */}
      <nav
        className={cn(
          "min-h-0 flex-1 space-y-0.5 overflow-y-auto",
          showLabels ? "px-4 py-6" : "px-2 py-4",
        )}
      >
        {navItems.map(({ label, href, icon: Icon, badge, resolveHref, isActive: isActiveFn }) => {
          const linkHref = resolveHref ? resolveHref(pathname, lastEventId) : href;
          const isActive = isActiveFn
            ? isActiveFn(pathname, locationHash)
            : pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
          const showApprovalBadges = href === "/approvals";
          const showInboxBadge = href === "/communications";
          const isCampaignBuilder = label === "Create with AI";
          // Heavy hubs: skip automatic prefetch so navigating elsewhere
          // does not trigger nested full RSC work for unused destinations.
          const isHeavyPrefetchRoute =
            href === "/communications" ||
            href === "/calendar" ||
            href === "/tasks" ||
            href === "/events" ||
            href === "/approvals" ||
            href === "/files" ||
            href === "/insights" ||
            href === "/vendors";

          return (
            <Link
              key={label}
              href={linkHref}
              prefetch={isCampaignBuilder || isHeavyPrefetchRoute ? false : undefined}
              title={showLabels ? undefined : label}
              onClick={(event) => {
                if (isCampaignBuilder) {
                  handleCampaignBuilderClick(event, linkHref);
                }
                if (href === "/communications") {
                  dispatchCommunicationsHubReset();
                }
                onNavigate?.();
              }}
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

        {showOwnerOps ? (
          showLabels ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOwnerOpsOpen((open) => !open)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                  ownerSectionActive
                    ? "text-cos-text"
                    : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                )}
                aria-expanded={ownerOpsOpen}
              >
                <Shield className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="flex-1 text-left tracking-wide">Owner</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    ownerOpsOpen && "rotate-180",
                  )}
                  strokeWidth={1.5}
                />
              </button>
              {ownerOpsOpen ? (
                <div className="ml-4 space-y-0.5 border-l border-cos-border pl-2">
                  <Link
                    href="/ops"
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "block px-3 py-2 text-sm transition-colors",
                      pathname === "/ops"
                        ? "bg-cos-dark text-[#f6f2eb]"
                        : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                    )}
                  >
                    Ops
                  </Link>
                  <Link
                    href="/ops/ai-apis"
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "block px-3 py-2 text-sm transition-colors",
                      pathname.startsWith("/ops/ai-apis")
                        ? "bg-cos-dark text-[#f6f2eb]"
                        : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                    )}
                  >
                    AI &amp; APIs
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-0.5 pt-2">
              <Link
                href="/ops"
                title="Owner Ops"
                onClick={() => onNavigate?.()}
                className={cn(
                  "group relative flex items-center justify-center p-2.5 text-sm transition-colors",
                  pathname === "/ops"
                    ? "bg-cos-dark text-[#f6f2eb]"
                    : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                )}
              >
                <Shield className="h-4 w-4" strokeWidth={1.5} />
              </Link>
              <Link
                href="/ops/ai-apis"
                title="AI & APIs"
                onClick={() => onNavigate?.()}
                className={cn(
                  "group relative flex items-center justify-center p-2.5 text-sm transition-colors",
                  pathname.startsWith("/ops/ai-apis")
                    ? "bg-cos-dark text-[#f6f2eb]"
                    : "text-cos-muted hover:bg-cos-bg hover:text-cos-text",
                )}
              >
                <Cpu className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          )
        ) : null}

        {/* Immediately under Insights (last nav item) — scrolls with nav, not footer-pinned. */}
        <div className={cn(showLabels ? "pt-3" : "flex justify-center pt-2")}>
          {showLabels ? <RalliAiAssistantWidget /> : <RalliAiAssistantWidget compact />}
        </div>
      </nav>

      {/* AI credits stay at the bottom of the sidebar. */}
      <div
        className={cn(
          "shrink-0 border-t border-cos-border bg-cos-card",
          showLabels ? "px-4 py-3" : "flex justify-center px-2 py-3",
        )}
      >
        {showLabels ? <AiCreditsWidget /> : <AiCreditsWidget compact />}
      </div>
    </aside>
  );
}
