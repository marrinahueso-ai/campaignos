"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
} from "lucide-react";
import { EventVolunteersTab } from "@/components/events-phase3/EventVolunteersTab";
import { EventDetailHero } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailHeroStatTab } from "@/components/events-phase3/EventDetailHeroStatsStrip";
import {
  EventDetailTabInvalidationProvider,
} from "@/components/events-phase3/EventDetailTabInvalidation";
import { EventStatusBadge } from "@/components/events/EventStatusBadge";
import { EditEventDetailsButton } from "@/components/event-workspace/EditEventDetailsButton";
import { EventManageMenu } from "@/components/event-workspace/EventManageMenu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import {
  appAccessBadgeLabel,
  createWithAiHref,
  eventVendorsHref,
  type EventResponsibilityPerson,
} from "@/lib/events/event-responsibility";
import {
  loadEventDetailTabAction,
  refreshEventDetailHeroStatsAction,
} from "@/lib/events-phase3/actions";
import {
  eventTabCacheKey,
  invalidateEventTabCacheEntry,
  tabAffectsHeroStats,
} from "@/lib/events-phase3/tab-cache";
import type {
  EventDetailLazyTab,
  EventDetailTabData,
} from "@/lib/events-phase3/tab-loaders";
import type { UnifiedApprovalsPageData } from "@/lib/approvals-scheduling/types";
import type { EventInsightsPageData } from "@/lib/insights/types";
import type { EventVendorsData, VendorCategory } from "@/types/vendors";
import type { TasksV2PageData } from "@/types/tasks-v2";
import { EVENT_TYPE_LABELS } from "@/lib/playbooks/constants";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { FilesPageData } from "@/types/campaign-files";
import type {
  EventPlaybookActivity,
  EventPlaybookNote,
} from "@/types/event-playbooks";
import type { ActivityLogEntry } from "@/types/event-workspace";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

const ApprovalsSchedulingHub = dynamic(
  () =>
    import("@/components/approvals-scheduling/ApprovalsSchedulingHub").then(
      (mod) => mod.ApprovalsSchedulingHub,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const TasksV2Shell = dynamic(
  () =>
    import("@/components/tasks-v2/TasksV2Shell").then((mod) => mod.TasksV2Shell),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const FilesTab = dynamic(
  () =>
    import("@/components/event-playbooks/FilesTab").then((mod) => mod.FilesTab),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const NotesTab = dynamic(
  () =>
    import("@/components/event-playbooks/NotesTab").then((mod) => mod.NotesTab),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventVendorsSection = dynamic(
  () =>
    import("@/components/vendors/EventVendorsSection").then(
      (mod) => mod.EventVendorsSection,
    ),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventInsightsTab = dynamic(
  () =>
    import("@/components/events-phase3/EventInsightsTab").then(
      (mod) => mod.EventInsightsTab,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

export type EventDetailTab =
  | "responsibilities"
  | "create-with-ai"
  | "approvals"
  | "tasks"
  | "files"
  | "notes"
  | "volunteers"
  | "insights"
  | "vendors"
  | "activity";

const TABS: { id: EventDetailTab; label: string }[] = [
  { id: "approvals", label: "Approvals" },
  { id: "tasks", label: "Tasks" },
  { id: "create-with-ai", label: "Create with AI" },
  { id: "volunteers", label: "Volunteers" },
  { id: "insights", label: "Insights" },
  { id: "responsibilities", label: "Responsibilities" },
  { id: "notes", label: "Notes" },
  { id: "files", label: "Files" },
  { id: "vendors", label: "Vendors" },
  { id: "activity", label: "Activity" },
];

const VALID_TABS = new Set<EventDetailTab>(TABS.map((tab) => tab.id));

const LAZY_TABS = new Set<EventDetailTab>([
  "approvals",
  "tasks",
  "files",
  "notes",
  "vendors",
  "activity",
  "insights",
]);

export type EventApprovalFlowStep = {
  label: string;
  value: string;
};

export type EventDetailWorkspacePanels = {
  notes?: EventPlaybookNote[];
  filesPageData?: FilesPageData;
  tablesAvailable?: boolean;
  playbookActivity?: EventPlaybookActivity[];
  workspaceTimeline?: ActivityLogEntry[];
  approvalsData?: UnifiedApprovalsPageData;
  tasksV2Data?: TasksV2PageData;
  insightsData?: EventInsightsPageData;
  eventVendorsData?: EventVendorsData;
  vendorDirectory?: {
    categories: VendorCategory[];
    events: Array<{ id: string; title: string; date: string }>;
    availableVendors: Array<{ id: string; name: string }>;
  };
};

interface EventDetailShellProps {
  event: Event;
  artwork: HeroArtworkSelection | null;
  playbookName: string | null;
  responsibilities: EventResponsibilityPerson[];
  approvalFlow: EventApprovalFlowStep[];
  heroStats: EventDetailHeroStats;
  canManageAssignments: boolean;
  onManageAssignments?: () => void;
  workspace?: EventDetailWorkspacePanels;
  initialTab?: string | null;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-cos-bg/70", className)} />
  );
}

function TabSkeleton({ tab }: { tab: EventDetailTab }) {
  switch (tab) {
    case "approvals":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <div className="flex flex-wrap gap-2">
            <SkeletonBar className="h-8 w-24" />
            <SkeletonBar className="h-8 w-28" />
            <SkeletonBar className="h-8 w-20" />
          </div>
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-full" />
          <SkeletonBar className="h-16 w-3/4" />
        </div>
      );
    case "tasks":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <SkeletonBar className="h-9 w-48" />
          <SkeletonBar className="h-12 w-full" />
          <SkeletonBar className="h-12 w-full" />
          <SkeletonBar className="h-12 w-5/6" />
        </div>
      );
    case "files":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
          </div>
        </div>
      );
    case "notes":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <SkeletonBar className="h-8 w-40" />
          <SkeletonBar className="h-20 w-full" />
          <SkeletonBar className="h-20 w-full" />
        </div>
      );
    case "vendors":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <div className="flex gap-3">
            <SkeletonBar className="h-36 w-40" />
            <SkeletonBar className="h-36 w-40" />
          </div>
        </div>
      );
    case "activity":
      return (
        <div className="space-y-3 rounded-xl border border-cos-border bg-cos-card p-4">
          <SkeletonBar className="h-5 w-28" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-full" />
          <SkeletonBar className="h-10 w-2/3" />
        </div>
      );
    case "insights":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
          </div>
          <SkeletonBar className="h-48 w-full" />
        </div>
      );
    default:
      return (
        <div className="rounded-xl border border-cos-border bg-cos-card p-4">
          <SkeletonBar className="h-24 w-full" />
        </div>
      );
  }
}

function loadedTabsFromWorkspace(
  workspace: EventDetailWorkspacePanels,
): Set<EventDetailTab> {
  const initial = new Set<EventDetailTab>();
  if (workspace.approvalsData) initial.add("approvals");
  if (workspace.tasksV2Data) initial.add("tasks");
  if (workspace.filesPageData) initial.add("files");
  if (workspace.notes !== undefined) initial.add("notes");
  if (workspace.eventVendorsData !== undefined) initial.add("vendors");
  if (
    workspace.playbookActivity !== undefined ||
    workspace.workspaceTimeline !== undefined
  ) {
    initial.add("activity");
  }
  if (workspace.insightsData) initial.add("insights");
  return initial;
}

function seedTabCache(
  eventId: string,
  workspace: EventDetailWorkspacePanels,
  cache: Map<string, EventDetailTabData>,
) {
  if (workspace.approvalsData) {
    cache.set(eventTabCacheKey(eventId, "approvals"), {
      tab: "approvals",
      approvalsData: workspace.approvalsData,
    });
  }
  if (workspace.tasksV2Data) {
    cache.set(eventTabCacheKey(eventId, "tasks"), {
      tab: "tasks",
      tasksV2Data: workspace.tasksV2Data,
    });
  }
  if (workspace.filesPageData) {
    cache.set(eventTabCacheKey(eventId, "files"), {
      tab: "files",
      filesPageData: workspace.filesPageData,
    });
  }
  if (workspace.notes !== undefined) {
    cache.set(eventTabCacheKey(eventId, "notes"), {
      tab: "notes",
      notes: workspace.notes,
      tablesAvailable: workspace.tablesAvailable ?? false,
    });
  }
  if (workspace.eventVendorsData !== undefined) {
    cache.set(eventTabCacheKey(eventId, "vendors"), {
      tab: "vendors",
      eventVendorsData: workspace.eventVendorsData,
      vendorDirectory: workspace.vendorDirectory ?? {
        categories: [],
        events: [],
        availableVendors: [],
      },
    });
  }
  if (
    workspace.playbookActivity !== undefined ||
    workspace.workspaceTimeline !== undefined
  ) {
    cache.set(eventTabCacheKey(eventId, "activity"), {
      tab: "activity",
      playbookActivity: workspace.playbookActivity ?? [],
      workspaceTimeline: workspace.workspaceTimeline ?? [],
    });
  }
  if (workspace.insightsData) {
    cache.set(eventTabCacheKey(eventId, "insights"), {
      tab: "insights",
      insightsData: workspace.insightsData,
    });
  }
}

export function EventDetailShell({
  event,
  artwork,
  playbookName,
  responsibilities,
  approvalFlow,
  heroStats,
  canManageAssignments,
  onManageAssignments,
  workspace = {},
  initialTab = null,
}: EventDetailShellProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EventDetailTab>(() => {
    // create-with-ai is a route handoff, not an in-page panel.
    if (
      initialTab &&
      initialTab !== "create-with-ai" &&
      VALID_TABS.has(initialTab as EventDetailTab)
    ) {
      return initialTab as EventDetailTab;
    }
    return "approvals";
  });
  const [panelData, setPanelData] = useState<EventDetailWorkspacePanels>(workspace);
  const [loadedTabs, setLoadedTabs] = useState<Set<EventDetailTab>>(() =>
    loadedTabsFromWorkspace(workspace),
  );
  const [tabError, setTabError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [liveHeroStats, setLiveHeroStats] = useState(heroStats);
  const [refreshingTab, setRefreshingTab] = useState<EventDetailLazyTab | null>(
    null,
  );
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const tabCacheRef = useRef<Map<string, EventDetailTabData>>(new Map());
  const cacheEventIdRef = useRef(event.id);

  const createWithAiUrl = createWithAiHref(event.id);
  const eventTypeLabel = event.eventType
    ? (EVENT_TYPE_LABELS[event.eventType] ?? null)
    : null;

  useEffect(() => {
    setLiveHeroStats(heroStats);
  }, [event.id, heroStats]);

  const applyTabData = useCallback((data: EventDetailTabData) => {
    setPanelData((prev) => {
      switch (data.tab) {
        case "approvals":
          return { ...prev, approvalsData: data.approvalsData };
        case "tasks":
          return { ...prev, tasksV2Data: data.tasksV2Data };
        case "files":
          return { ...prev, filesPageData: data.filesPageData };
        case "notes":
          return {
            ...prev,
            notes: data.notes,
            tablesAvailable: data.tablesAvailable,
          };
        case "vendors":
          return {
            ...prev,
            eventVendorsData: data.eventVendorsData,
            vendorDirectory: data.vendorDirectory,
          };
        case "activity":
          return {
            ...prev,
            playbookActivity: data.playbookActivity,
            workspaceTimeline: data.workspaceTimeline,
          };
        case "insights":
          return {
            ...prev,
            insightsData: data.insightsData,
          };
        default:
          return prev;
      }
    });
  }, []);

  const workspaceRef = useRef(workspace);
  workspaceRef.current = workspace;
  const loadedTabsRef = useRef(loadedTabs);
  loadedTabsRef.current = loadedTabs;
  const fetchInFlightRef = useRef<Set<string>>(new Set());
  const invalidateInFlightRef = useRef<Set<string>>(new Set());

  // Isolate cache when navigating to a different event only.
  useEffect(() => {
    if (cacheEventIdRef.current === event.id) {
      if (tabCacheRef.current.size === 0) {
        seedTabCache(event.id, workspaceRef.current, tabCacheRef.current);
      }
      return;
    }
    cacheEventIdRef.current = event.id;
    tabCacheRef.current = new Map();
    fetchInFlightRef.current = new Set();
    invalidateInFlightRef.current = new Set();
    seedTabCache(event.id, workspaceRef.current, tabCacheRef.current);
    setPanelData(workspaceRef.current);
    setLoadedTabs(loadedTabsFromWorkspace(workspaceRef.current));
    setTabError(null);
    setRefreshError(null);
    setRefreshingTab(null);
    if (
      initialTab &&
      initialTab !== "create-with-ai" &&
      VALID_TABS.has(initialTab as EventDetailTab)
    ) {
      setTab(initialTab as EventDetailTab);
    } else {
      setTab("approvals");
    }
  }, [event.id, initialTab]);

  // Same-event deep links (?tab=) must update the active panel — cache effect above
  // early-returns when event.id is unchanged, so sync tab separately.
  useEffect(() => {
    if (
      initialTab &&
      initialTab !== "create-with-ai" &&
      VALID_TABS.has(initialTab as EventDetailTab)
    ) {
      setTab(initialTab as EventDetailTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialTab === "create-with-ai") {
      // Hard navigate so we never soft-prefetch the heavy builder onto the event page.
      window.location.replace(createWithAiUrl);
    }
  }, [initialTab, event.id, createWithAiUrl]);

  const selectHeroStatTab = useCallback(
    (nextTab: EventDetailHeroStatTab) => {
      setTab(nextTab);
      router.replace(`/events/${encodeURIComponent(event.id)}?tab=${nextTab}`, {
        scroll: false,
      });
    },
    [event.id, router],
  );

  const ensureTabLoaded = useCallback(
    (nextTab: EventDetailTab) => {
      if (!LAZY_TABS.has(nextTab)) {
        return;
      }

      if (loadedTabsRef.current.has(nextTab)) {
        return;
      }

      const cacheKey = eventTabCacheKey(event.id, nextTab);
      const cached = tabCacheRef.current.get(cacheKey);
      if (cached) {
        applyTabData(cached);
        setLoadedTabs((prev) => {
          if (prev.has(nextTab)) {
            return prev;
          }
          return new Set(prev).add(nextTab);
        });
        setTabError(null);
        return;
      }

      if (fetchInFlightRef.current.has(cacheKey)) {
        return;
      }
      fetchInFlightRef.current.add(cacheKey);

      setTabError(null);
      startTransition(async () => {
        try {
          const result = await loadEventDetailTabAction(event.id, nextTab);
          if (!result.success) {
            setTabError(result.error);
            return;
          }
          tabCacheRef.current.set(cacheKey, result.data);
          applyTabData(result.data);
          setLoadedTabs((prev) => {
            if (prev.has(nextTab)) {
              return prev;
            }
            return new Set(prev).add(nextTab);
          });
        } finally {
          fetchInFlightRef.current.delete(cacheKey);
        }
      });
    },
    [event.id, applyTabData],
  );

  useEffect(() => {
    ensureTabLoaded(tab);
  }, [tab, ensureTabLoaded]);

  const invalidateEventTab = useCallback(
    async (tabToRefresh: EventDetailLazyTab) => {
      const cacheKey = eventTabCacheKey(event.id, tabToRefresh);
      invalidateEventTabCacheEntry(tabCacheRef.current, event.id, tabToRefresh);
      fetchInFlightRef.current.delete(cacheKey);

      if (invalidateInFlightRef.current.has(cacheKey)) {
        return { success: true as const };
      }
      invalidateInFlightRef.current.add(cacheKey);
      setRefreshingTab(tabToRefresh);
      setRefreshError(null);

      try {
        const result = await loadEventDetailTabAction(event.id, tabToRefresh);
        if (!result.success) {
          setRefreshError(result.error);
          return { success: false as const, error: result.error };
        }

        tabCacheRef.current.set(cacheKey, result.data);
        applyTabData(result.data);
        setLoadedTabs((prev) => new Set(prev).add(tabToRefresh));

        if (tabAffectsHeroStats(tabToRefresh)) {
          const statsResult = await refreshEventDetailHeroStatsAction(event.id);
          if (statsResult.success) {
            setLiveHeroStats(statsResult.data);
          }
        }

        setRefreshError(null);
        return { success: true as const };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to refresh this tab.";
        setRefreshError(message);
        return { success: false as const, error: message };
      } finally {
        invalidateInFlightRef.current.delete(cacheKey);
        setRefreshingTab((current) =>
          current === tabToRefresh ? null : current,
        );
      }
    },
    [event.id, applyTabData],
  );

  const invalidationValue = useMemo(
    () => ({
      eventId: event.id,
      invalidateEventTab,
      refreshingTab,
      refreshError,
    }),
    [event.id, invalidateEventTab, refreshingTab, refreshError],
  );

  // Warm Approvals/Tasks JS chunks only — do not prefetch tab data.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    const warm = () => {
      if (cancelled) {
        return;
      }
      void import("@/components/approvals-scheduling/ApprovalsSchedulingHub");
      void import("@/components/tasks-v2/TasksV2Shell");
    };
    const ric = (
      window as Window & {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      }
    ).requestIdleCallback;
    if (ric) {
      const id = ric(warm, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }
    const timeoutId = window.setTimeout(warm, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [event.id]);

  const orderedResponsibilities = useMemo(() => {
    const order = [
      "Supervisor",
      "Event Lead",
      "Assistant Lead",
      "Team Member",
      "Final Approval",
      "Publisher",
    ] as const;
    return [...responsibilities].sort(
      (left, right) =>
        order.indexOf(left.responsibility as (typeof order)[number]) -
        order.indexOf(right.responsibility as (typeof order)[number]),
    );
  }, [responsibilities]);

  const activityItems = useMemo(() => {
    const fromPlaybook = (panelData.playbookActivity ?? []).map((entry) => ({
      id: `playbook-${entry.id}`,
      title: entry.action,
      detail: entry.actorName,
      at: entry.createdAt,
    }));
    const fromTimeline = (panelData.workspaceTimeline ?? []).map((entry) => ({
      id: `timeline-${entry.id}`,
      title: entry.title,
      detail: entry.description,
      at: entry.occurredAt,
    }));
    return [...fromPlaybook, ...fromTimeline].sort(
      (left, right) =>
        new Date(right.at).getTime() - new Date(left.at).getTime(),
    );
  }, [panelData.playbookActivity, panelData.workspaceTimeline]);

  const showTabLoading =
    LAZY_TABS.has(tab) && !loadedTabs.has(tab) && (pending || !tabError);

  return (
    <EventDetailTabInvalidationProvider value={invalidationValue}>
    <div className="studio-page event-detail-atmosphere space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm text-cos-muted hover:text-cos-brand-navy"
          >
            <ArrowLeft className="h-4 w-4" />
            Events
            <span className="text-cos-border">›</span>
            <span className="truncate text-cos-text">{event.title}</span>
          </Link>
          <h1 className="mt-3 font-display text-3xl text-cos-brand-navy sm:text-4xl">
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cos-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-cos-brand-sage" />
              {formatEventDate(event.date)}
            </span>
            {event.time ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-cos-brand-sage" />
                {formatEventTime(event.time)}
              </span>
            ) : null}
            {eventTypeLabel ? (
              <Badge
                variant="default"
                className="bg-cos-brand-navy-soft text-cos-brand-navy"
              >
                {eventTypeLabel}
              </Badge>
            ) : null}
            <EventStatusBadge status={event.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EditEventDetailsButton event={event} size="sm" />
          <EventManageMenu event={event} size="sm" />
        </div>
      </div>

      <EventDetailHero
        event={event}
        artwork={artwork}
        playbookName={playbookName}
        eventTypeLabel={eventTypeLabel}
        eventLeadName={
          responsibilities.find((row) => row.responsibility === "Event Lead")
            ?.displayName ?? "Not assigned"
        }
        createWithAiHref={createWithAiUrl}
        stats={liveHeroStats}
        onSelectTab={selectHeroStatTab}
      />

      <div className="border-b border-cos-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Event sections">
          {TABS.map((entry) => {
            // Create with AI is a separate heavy route — navigate there directly
            // instead of mounting a stub tab (keeps event page light).
            if (entry.id === "create-with-ai") {
              return (
                <Link
                  key={entry.id}
                  href={createWithAiUrl}
                  prefetch={false}
                  onClick={(event) => {
                    event.preventDefault();
                    window.location.assign(createWithAiUrl);
                  }}
                  className={cn(
                    "rounded-t-md border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-cos-muted transition-colors",
                    "hover:bg-cos-brand-sage-soft/35 hover:text-cos-brand-navy",
                  )}
                >
                  {entry.label}
                </Link>
              );
            }

            const isActive = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                data-testid={`event-detail-tab-${entry.id}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  setTab(entry.id);
                  router.replace(
                    `/events/${encodeURIComponent(event.id)}?tab=${entry.id}`,
                    { scroll: false },
                  );
                }}
                className={cn(
                  "rounded-t-md border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "border-cos-brand-mustard bg-transparent text-cos-brand-navy"
                    : "border-transparent text-cos-muted hover:bg-cos-brand-sage-soft/35 hover:text-cos-brand-navy",
                )}
              >
                {entry.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {tabError && LAZY_TABS.has(tab) && !loadedTabs.has(tab) ? (
          <div className="rounded-xl border border-cos-border bg-cos-card p-4">
            <p className="text-sm text-red-600" role="alert">
              {tabError}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => ensureTabLoaded(tab)}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {refreshError && LAZY_TABS.has(tab) && loadedTabs.has(tab) ? (
          <div className="mb-3 rounded-xl border border-cos-border bg-cos-card p-3">
            <p className="text-sm text-red-600" role="alert">
              Saved, but this tab could not refresh. {refreshError}
            </p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                void invalidateEventTab(tab as EventDetailLazyTab);
              }}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {refreshingTab === tab && LAZY_TABS.has(tab) ? (
          <p className="mb-2 text-xs text-cos-muted" aria-live="polite">
            Updating…
          </p>
        ) : null}

        {showTabLoading ? <TabSkeleton tab={tab} /> : null}

          {tab === "responsibilities" ? (
            <section className="rounded-xl border border-cos-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl text-cos-text">
                    Event Responsibilities
                  </h2>
                  <p className="mt-1 text-sm text-cos-muted">
                    People and teams responsible for this event.
                  </p>
                </div>
                {canManageAssignments ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onManageAssignments}
                  >
                    <Users className="h-4 w-4" />
                    Manage Assignments
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs tracking-wide text-cos-muted uppercase">
                    <tr className="border-b border-cos-border">
                      <th className="px-2 py-2 font-medium">Responsibility</th>
                      <th className="px-2 py-2 font-medium">Person / Team</th>
                      <th className="px-2 py-2 font-medium">Title</th>
                      <th className="px-2 py-2 font-medium">Committee</th>
                      <th className="px-2 py-2 font-medium">Access</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      [
                        "Supervisor",
                        "Event Lead",
                        "Assistant Lead",
                        "Team Member",
                        "Final Approval",
                        "Publisher",
                      ] as const
                    ).flatMap((label) => {
                      const matches = orderedResponsibilities.filter(
                        (row) => row.responsibility === label,
                      );
                      if (matches.length === 0) {
                        if (
                          label === "Final Approval" ||
                          label === "Publisher"
                        ) {
                          return [];
                        }
                        return [
                          <tr
                            key={`${label}-empty`}
                            className="border-b border-cos-border/70"
                          >
                            <td className="px-2 py-3 font-medium text-cos-text">
                              {label}
                            </td>
                            <td
                              className="px-2 py-3 text-cos-muted"
                              colSpan={5}
                            >
                              Not assigned
                            </td>
                          </tr>,
                        ];
                      }
                      return matches.map((row) => (
                        <tr
                          key={`${row.responsibility}-${row.memberId}`}
                          className="border-b border-cos-border/70"
                        >
                          <td className="px-2 py-3 font-medium text-cos-text">
                            {row.responsibility}
                          </td>
                          <td className="px-2 py-3 text-cos-text">
                            {row.displayName}
                          </td>
                          <td className="px-2 py-3 text-cos-muted">
                            {row.organizationTitle ?? "—"}
                          </td>
                          <td className="px-2 py-3 text-cos-muted">
                            {row.committeeName ?? "—"}
                          </td>
                          <td className="px-2 py-3">
                            <Badge variant="default">
                              {row.source === "routing"
                                ? row.responsibility === "Final Approval"
                                  ? "Approval Access"
                                  : "Publish Access"
                                : appAccessBadgeLabel(row.campaignRole)}
                            </Badge>
                          </td>
                          <td className="px-2 py-3">
                            <Badge variant={row.active ? "success" : "default"}>
                              {row.active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 rounded-lg border border-cos-border bg-cos-bg/40 p-4">
                <h3 className="text-sm font-semibold text-cos-text">
                  Approval flow
                </h3>
                <ol className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  {approvalFlow.map((step, index) => (
                    <li
                      key={step.label}
                      className="inline-flex items-center gap-2 text-sm"
                    >
                      {index > 0 ? (
                        <span className="hidden text-cos-muted sm:inline">
                          →
                        </span>
                      ) : null}
                      <span className="rounded-lg border border-cos-border bg-white px-3 py-1.5">
                        <span className="text-cos-muted">{step.label}: </span>
                        <span className="font-medium text-cos-text">
                          {step.value}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          ) : null}

          {tab === "approvals" && panelData.approvalsData && loadedTabs.has("approvals") ? (
            <ApprovalsSchedulingHub
              {...panelData.approvalsData}
              lockedEventId={event.id}
              embedded
            />
          ) : null}

          {tab === "tasks" && loadedTabs.has("tasks") ? (
            panelData.tasksV2Data ? (
              <Suspense
                fallback={
                  <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
                }
              >
                <TasksV2Shell
                  data={panelData.tasksV2Data}
                  lockedEventId={event.id}
                  embedded
                />
              </Suspense>
            ) : (
              <div className="rounded-xl border border-cos-border bg-cos-card p-6">
                <h3 className="font-display text-lg text-cos-text">Tasks unavailable</h3>
                <p className="mt-1 text-sm text-cos-muted">
                  Task workspace data did not load for this event.
                </p>
              </div>
            )
          ) : null}

          {tab === "files" && panelData.filesPageData && loadedTabs.has("files") ? (
            <FilesTab eventId={event.id} data={panelData.filesPageData} />
          ) : null}

          {tab === "notes" && loadedTabs.has("notes") ? (
            <NotesTab
              eventId={event.id}
              notes={panelData.notes ?? []}
              tablesAvailable={panelData.tablesAvailable ?? false}
            />
          ) : null}

          {tab === "volunteers" ? <EventVolunteersTab event={event} /> : null}

          {tab === "vendors" && loadedTabs.has("vendors") ? (
            <EventVendorsSection
              eventId={event.id}
              data={
                panelData.eventVendorsData ?? {
                  vendors: [],
                  canWrite: false,
                }
              }
              categories={panelData.vendorDirectory?.categories ?? []}
              events={panelData.vendorDirectory?.events ?? []}
              availableVendors={
                panelData.vendorDirectory?.availableVendors ?? []
              }
              directoryHref={eventVendorsHref(event.id)}
              deferDirectoryLoad
            />
          ) : null}

          {tab === "activity" && loadedTabs.has("activity") ? (
            <div className="rounded-xl border border-cos-border bg-white p-6">
              <h3 className="font-display text-xl text-cos-text">Activity</h3>
              {activityItems.length === 0 ? (
                <p className="mt-2 text-sm text-cos-muted">
                  No activity has been recorded for this event yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {activityItems.map((item) => (
                    <li
                      key={item.id}
                      className="border-b border-cos-border/70 pb-3 text-sm last:border-0"
                    >
                      <p className="font-medium text-cos-text">{item.title}</p>
                      {item.detail ? (
                        <p className="mt-0.5 text-cos-muted">{item.detail}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-cos-muted">
                        {new Date(item.at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === "insights" &&
          panelData.insightsData &&
          loadedTabs.has("insights") ? (
            <EventInsightsTab data={panelData.insightsData} />
          ) : null}
      </div>
    </div>
    </EventDetailTabInvalidationProvider>
  );
}

/** Fallback availability marker for regression tests. */
export const EVENT_DETAIL_FALLBACK_EXPORT = "EventPlanningHub";
