"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import {
  EventDetailEaseHero,
  type EaseJumpTab,
} from "@/components/events-phase3/EventDetailEaseHero";
import { EventDetailCreateWithAiPanel } from "@/components/events-phase3/EventDetailCreateWithAiPanel";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import {
  EventDetailTabInvalidationProvider,
} from "@/components/events-phase3/EventDetailTabInvalidation";
import { OnboardingYoureSetToast } from "@/components/onboarding/OnboardingYoureSetToast";
import { Button } from "@/components/ui/Button";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventResponsibilityPerson } from "@/lib/events/event-responsibility";
import {
  loadEventDetailTabAction,
  refreshEventDetailHeroStatsAction,
} from "@/lib/events-phase3/actions";
import {
  eventTabCacheKey,
  invalidateEventTabCacheEntry,
  setEventTabCacheEntry,
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
import type { FilesPageData } from "@/types/campaign-files";
import type {
  EventPlaybookActivity,
  EventPlaybookNote,
} from "@/types/event-playbooks";
import type { ActivityLogEntry } from "@/types/event-workspace";
import type { Event } from "@/types";
import { cn } from "@/lib/utils/cn";

const EventDetailApprovalsEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailApprovalsEasePanel").then(
      (mod) => mod.EventDetailApprovalsEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailTasksEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailTasksEasePanel").then(
      (mod) => mod.EventDetailTasksEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailFilesEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailFilesEasePanel").then(
      (mod) => mod.EventDetailFilesEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailNotesEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailNotesEasePanel").then(
      (mod) => mod.EventDetailNotesEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailVendorsEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailVendorsEasePanel").then(
      (mod) => mod.EventDetailVendorsEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailInsightsEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailInsightsEasePanel").then(
      (mod) => mod.EventDetailInsightsEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailVolunteersEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailVolunteersEasePanel").then(
      (mod) => mod.EventDetailVolunteersEasePanel,
    ),
  {
    loading: () => (
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
    ),
  },
);

const EventDetailTeamEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailTeamEasePanel").then(
      (mod) => mod.EventDetailTeamEasePanel,
    ),
);

const EventDetailActivityEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailActivityEasePanel").then(
      (mod) => mod.EventDetailActivityEasePanel,
    ),
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

/** Flat labels for deep links / tests — Create with AI stays deep-linkable via hero CTA. */
const TAB_LABELS: Record<EventDetailTab, string> = {
  approvals: "Approvals",
  tasks: "Tasks",
  "create-with-ai": "Create with AI",
  volunteers: "Volunteers",
  insights: "Insights",
  responsibilities: "Team",
  notes: "Notes",
  files: "Files",
  vendors: "Vendors",
  activity: "Activity",
};

const PLANNING_TABS: EventDetailTab[] = ["tasks", "notes", "files"];
const COMMUNITY_TABS: EventDetailTab[] = ["responsibilities", "vendors"];
const TOP_LEVEL_TABS: EventDetailTab[] = [
  "approvals",
  "volunteers",
  "insights",
  "activity",
];

const TAB_COUNTS: Partial<
  Record<EventDetailTab, (stats: EventDetailHeroStats) => number>
> = {
  approvals: (stats) => stats.pendingApprovals,
  tasks: (stats) => stats.tasks,
  volunteers: (stats) => stats.filledSpots,
};

const VALID_TABS = new Set<EventDetailTab>(
  Object.keys(TAB_LABELS) as EventDetailTab[],
);

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
  /** Server-streamed Approvals body (Suspense) for bare URL / Approvals tab. */
  approvalsSlot?: ReactNode;
  initialTab?: string | null;
  /** Ease page-4 finale after Team+Meta — dismissible “You’re set” toast. */
  showYoureSet?: boolean;
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
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "approvals"), {
      tab: "approvals",
      approvalsData: workspace.approvalsData,
    });
  }
  if (workspace.tasksV2Data) {
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "tasks"), {
      tab: "tasks",
      tasksV2Data: workspace.tasksV2Data,
    });
  }
  if (workspace.filesPageData) {
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "files"), {
      tab: "files",
      filesPageData: workspace.filesPageData,
    });
  }
  if (workspace.notes !== undefined) {
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "notes"), {
      tab: "notes",
      notes: workspace.notes,
      tablesAvailable: workspace.tablesAvailable ?? false,
    });
  }
  if (workspace.eventVendorsData !== undefined) {
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "vendors"), {
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
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "activity"), {
      tab: "activity",
      playbookActivity: workspace.playbookActivity ?? [],
      workspaceTimeline: workspace.workspaceTimeline ?? [],
    });
  }
  if (workspace.insightsData) {
    setEventTabCacheEntry(cache, eventTabCacheKey(eventId, "insights"), {
      tab: "insights",
      insightsData: workspace.insightsData,
    });
  }
}

export function EventDetailShell({
  event,
  artwork,
  playbookName: _playbookName,
  responsibilities,
  approvalFlow: _approvalFlow,
  heroStats,
  canManageAssignments,
  onManageAssignments,
  workspace = {},
  approvalsSlot,
  initialTab = null,
  showYoureSet = false,
}: EventDetailShellProps) {
  const [tab, setTab] = useState<EventDetailTab>(() => {
    if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
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
  const [openTabGroup, setOpenTabGroup] = useState<"planning" | "community" | null>(
    null,
  );
  const [refreshingTab, setRefreshingTab] = useState<EventDetailLazyTab | null>(
    null,
  );
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const tabCacheRef = useRef<Map<string, EventDetailTabData>>(new Map());
  const cacheEventIdRef = useRef(event.id);
  const tabLoadAbortRef = useRef<AbortController | null>(null);

  const syncTabUrl = useCallback(
    (nextTab: EventDetailTab) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (nextTab === "approvals") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }
      const query = params.toString();
      const href = query
        ? `/events/${encodeURIComponent(event.id)}?${query}`
        : `/events/${encodeURIComponent(event.id)}`;
      window.history.replaceState(window.history.state, "", href);
    },
    [event.id],
  );

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
    if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
      setTab(initialTab as EventDetailTab);
    } else {
      setTab("approvals");
    }
  }, [event.id, initialTab]);

  // Same-event deep links (?tab=) must update the active panel — cache effect above
  // early-returns when event.id is unchanged, so sync tab separately.
  useEffect(() => {
    if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
      setTab(initialTab as EventDetailTab);
    }
  }, [initialTab]);

  const selectHeroJumpTab = useCallback(
    (nextTab: EaseJumpTab) => {
      setTab(nextTab);
      syncTabUrl(nextTab);
    },
    [syncTabUrl],
  );

  const ensureTabLoaded = useCallback(
    (nextTab: EventDetailTab) => {
      if (!LAZY_TABS.has(nextTab)) {
        return;
      }

      // Server-streamed Approvals slot owns first paint for the default tab.
      if (nextTab === "approvals" && approvalsSlot) {
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

      tabLoadAbortRef.current?.abort();
      const abort = new AbortController();
      tabLoadAbortRef.current = abort;

      setTabError(null);
      startTransition(async () => {
        try {
          const result = await loadEventDetailTabAction(event.id, nextTab);
          if (abort.signal.aborted) {
            return;
          }
          if (!result.success) {
            setTabError(result.error);
            return;
          }
          setEventTabCacheEntry(tabCacheRef.current, cacheKey, result.data);
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
    [event.id, applyTabData, approvalsSlot],
  );

  useEffect(() => {
    return () => {
      tabLoadAbortRef.current?.abort();
    };
  }, [event.id]);

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

        setEventTabCacheEntry(tabCacheRef.current, cacheKey, result.data);
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
      void import("@/components/events-phase3/EventDetailApprovalsEasePanel");
      void import("@/components/events-phase3/EventDetailTasksEasePanel");
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
    LAZY_TABS.has(tab) &&
    !loadedTabs.has(tab) &&
    !(tab === "approvals" && approvalsSlot) &&
    (pending || !tabError);

  return (
    <EventDetailTabInvalidationProvider value={invalidationValue}>
    <div className="studio-page relative space-y-6 pb-12 before:pointer-events-none before:absolute before:top-0 before:left-[-2rem] before:h-60 before:w-60 before:rounded-full before:bg-[radial-gradient(circle,rgba(107,129,113,0.12),transparent_70%)] before:content-[''] after:pointer-events-none after:absolute after:top-10 after:right-0 after:h-52 after:w-52 after:rounded-full after:bg-[radial-gradient(circle,rgba(196,146,46,0.1),transparent_70%)] after:content-['']">
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-cos-muted hover:text-cos-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Events
        <span className="text-cos-border">›</span>
        <span className="truncate text-cos-text">{event.title}</span>
      </Link>

      {showYoureSet ? (
        <OnboardingYoureSetToast eventTitle={event.title} />
      ) : null}

      <EventDetailEaseHero
        event={event}
        artwork={artwork}
        stats={liveHeroStats}
        onSelectTab={selectHeroJumpTab}
      />

      <nav
        className="relative flex flex-wrap items-center gap-1 border-b border-[#e8e3da] sm:gap-2"
        aria-label="Event sections"
        role="tablist"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setOpenTabGroup(null);
          }
        }}
      >
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openTabGroup === "planning"}
            data-testid="event-detail-tab-group-planning"
            onClick={() =>
              setOpenTabGroup((current) =>
                current === "planning" ? null : "planning",
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition",
              PLANNING_TABS.includes(tab)
                ? "border-[#c4922e] text-[#2f4a3c]"
                : "border-transparent text-[#6b8171] hover:text-[#2f4a3c]",
            )}
          >
            Planning
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          {openTabGroup === "planning" ? (
            <div
              role="menu"
              className="absolute top-full left-0 z-50 mt-1 w-48 rounded-xl border border-[#e8e3da] bg-white p-2 shadow-xl"
            >
              {PLANNING_TABS.map((id) => {
                const isActive = tab === id;
                const countFn = TAB_COUNTS[id];
                const count = countFn ? countFn(liveHeroStats) : null;
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    data-testid={`event-detail-tab-${id}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      setTab(id);
                      syncTabUrl(id);
                      setOpenTabGroup(null);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-4 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-[#f6f2eb] font-semibold text-[#2f4a3c]"
                        : "text-[#2f4a3c] hover:bg-[#f6f2eb]",
                    )}
                  >
                    <span>{TAB_LABELS[id]}</span>
                    {count !== null ? (
                      <span className="tabular-nums text-[#6b8171]">{count}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {TOP_LEVEL_TABS.slice(0, 2).map((id) => {
          const isActive = tab === id;
          const countFn = TAB_COUNTS[id];
          const count = countFn ? countFn(liveHeroStats) : null;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`event-detail-tab-${id}`}
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setTab(id);
                syncTabUrl(id);
                setOpenTabGroup(null);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition",
                isActive
                  ? "border-[#c4922e] text-[#2f4a3c]"
                  : "border-transparent text-[#6b8171] hover:text-[#2f4a3c]",
              )}
            >
              {TAB_LABELS[id]}
              {count !== null ? (
                <span className="tabular-nums text-[#6b8171]">{count}</span>
              ) : null}
            </button>
          );
        })}

        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openTabGroup === "community"}
            data-testid="event-detail-tab-group-community"
            onClick={() =>
              setOpenTabGroup((current) =>
                current === "community" ? null : "community",
              )
            }
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition",
              COMMUNITY_TABS.includes(tab)
                ? "border-[#c4922e] text-[#2f4a3c]"
                : "border-transparent text-[#6b8171] hover:text-[#2f4a3c]",
            )}
          >
            Community
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          {openTabGroup === "community" ? (
            <div
              role="menu"
              className="absolute top-full left-0 z-50 mt-1 w-48 rounded-xl border border-[#e8e3da] bg-white p-2 shadow-xl"
            >
              {COMMUNITY_TABS.map((id) => {
                const isActive = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="menuitem"
                    data-testid={`event-detail-tab-${id}`}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      setTab(id);
                      syncTabUrl(id);
                      setOpenTabGroup(null);
                    }}
                    className={cn(
                      "block w-full rounded-lg px-4 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-[#f6f2eb] font-semibold text-[#2f4a3c]"
                        : "text-[#2f4a3c] hover:bg-[#f6f2eb]",
                    )}
                  >
                    {TAB_LABELS[id]}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {TOP_LEVEL_TABS.slice(2).map((id) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              data-testid={`event-detail-tab-${id}`}
              aria-selected={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setTab(id);
                syncTabUrl(id);
                setOpenTabGroup(null);
              }}
              className={cn(
                "inline-flex items-center border-b-2 px-3 py-3 text-sm font-medium transition",
                isActive
                  ? "border-[#c4922e] text-[#2f4a3c]"
                  : "border-transparent text-[#6b8171] hover:text-[#2f4a3c]",
              )}
            >
              {TAB_LABELS[id]}
            </button>
          );
        })}

        {/* Deep-link only — Create with AI lives on Generate Event Plan in the hero */}
        {tab === "create-with-ai" ? (
          <button
            type="button"
            role="tab"
            data-testid="event-detail-tab-create-with-ai"
            aria-selected
            aria-current="page"
            className="ml-auto inline-flex items-center border-b-2 border-[#c4922e] px-3 py-3 text-sm font-semibold text-[#2f4a3c]"
          >
            Create with AI
          </button>
        ) : null}
      </nav>

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

          {tab === "create-with-ai" ? (
            <EventDetailCreateWithAiPanel
              eventId={event.id}
              eventTitle={event.title}
            />
          ) : null}

          {tab === "responsibilities" ? (
            <EventDetailTeamEasePanel
              responsibilities={responsibilities}
              canManageAssignments={canManageAssignments}
              onManageAssignments={onManageAssignments}
            />
          ) : null}

          {tab === "approvals" &&
          panelData.approvalsData &&
          loadedTabs.has("approvals") ? (
            <EventDetailApprovalsEasePanel
              items={panelData.approvalsData.items}
              canViewAll={panelData.approvalsData.canViewAll}
              lockedEventId={event.id}
            />
          ) : tab === "approvals" && approvalsSlot ? (
            approvalsSlot
          ) : null}

          {tab === "tasks" && loadedTabs.has("tasks") ? (
            panelData.tasksV2Data ? (
              <Suspense
                fallback={
                  <div className="min-h-[16rem] animate-pulse rounded-xl bg-cos-bg/60" />
                }
              >
                <EventDetailTasksEasePanel data={panelData.tasksV2Data} />
              </Suspense>
            ) : (
              <div className="rounded-xl border border-cos-border bg-cos-card p-6">
                <h3 className="font-display text-lg text-cos-text">
                  Tasks unavailable
                </h3>
                <p className="mt-1 text-sm text-cos-muted">
                  Task workspace data did not load for this event.
                </p>
              </div>
            )
          ) : null}

          {tab === "files" &&
          panelData.filesPageData &&
          loadedTabs.has("files") ? (
            <EventDetailFilesEasePanel
              eventId={event.id}
              data={panelData.filesPageData}
            />
          ) : null}

          {tab === "notes" && loadedTabs.has("notes") ? (
            <EventDetailNotesEasePanel
              eventId={event.id}
              notes={panelData.notes ?? []}
              tablesAvailable={panelData.tablesAvailable ?? false}
            />
          ) : null}

          {tab === "volunteers" ? (
            <EventDetailVolunteersEasePanel event={event} />
          ) : null}

          {tab === "vendors" && loadedTabs.has("vendors") ? (
            <EventDetailVendorsEasePanel
              eventId={event.id}
              data={
                panelData.eventVendorsData ?? {
                  vendors: [],
                  canWrite: false,
                }
              }
              directoryHref="/vendors"
            />
          ) : null}

          {tab === "activity" && loadedTabs.has("activity") ? (
            <EventDetailActivityEasePanel items={activityItems} />
          ) : null}

          {tab === "insights" &&
          panelData.insightsData &&
          loadedTabs.has("insights") ? (
            <EventDetailInsightsEasePanel data={panelData.insightsData} />
          ) : null}
      </div>
    </div>
    </EventDetailTabInvalidationProvider>
  );
}

/** Fallback availability marker for regression tests. */
export const EVENT_DETAIL_FALLBACK_EXPORT = "EventPlanningHub";
