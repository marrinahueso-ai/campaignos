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
import { ArrowLeft, UserPlus } from "lucide-react";
import { EventCommunityPanel } from "@/components/events-phase3/EventCommunityPanel";
import { EventDetailCreateWithAiPanel } from "@/components/events-phase3/EventDetailCreateWithAiPanel";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
import {
  EventDetailTabInvalidationProvider,
} from "@/components/events-phase3/EventDetailTabInvalidation";
import { EventPlanningShell } from "@/components/events-phase3/EventPlanningShell";
import { EventWorkspaceContextHeader } from "@/components/events-phase3/EventWorkspaceContextHeader";
import { EventWorkspaceOverviewPanel } from "@/components/events-phase3/EventWorkspaceOverviewPanel";
import { ew } from "@/components/events-phase3/event-workspace-tokens";
import { OnboardingYoureSetToast } from "@/components/onboarding/OnboardingYoureSetToast";
import { Button } from "@/components/ui/Button";
import type { HeroArtworkSelection } from "@/lib/event-workspace/select-hero-artwork";
import type { EventInviteCollaboratorPreview } from "@/lib/events-phase3/invite-event-member";
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
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
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
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
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
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
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
      <div className="min-h-[12rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
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
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
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
      <div className="min-h-[16rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
    ),
  },
);

const EventDetailActivityEasePanel = dynamic(
  () =>
    import("@/components/events-phase3/EventDetailActivityEasePanel").then(
      (mod) => mod.EventDetailActivityEasePanel,
    ),
);

export type EventDetailTab =
  | "overview"
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
  overview: "Overview",
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
  onInviteTeamMember?: () => void;
  /** Local invite/add collaborator previews for Event Team UI. */
  inviteCollaborators?: EventInviteCollaboratorPreview[];
  workspace?: EventDetailWorkspacePanels;
  /** Server-streamed Approvals body (Suspense) for Approvals tab. */
  approvalsSlot?: ReactNode;
  initialTab?: string | null;
  /** Ease page-4 finale after Team+Meta — dismissible “You’re set” toast. */
  showYoureSet?: boolean;
}

function SkeletonBar({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-[#f4f0ea]", className)} />
  );
}

function TabSkeleton({ tab }: { tab: EventDetailTab }) {
  switch (tab) {
    case "approvals":
      return (
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
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
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
          <SkeletonBar className="h-9 w-48" />
          <SkeletonBar className="h-12 w-full" />
          <SkeletonBar className="h-12 w-full" />
          <SkeletonBar className="h-12 w-5/6" />
        </div>
      );
    case "files":
      return (
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
            <SkeletonBar className="h-24 w-full" />
          </div>
        </div>
      );
    case "notes":
      return (
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
          <SkeletonBar className="h-8 w-40" />
          <SkeletonBar className="h-20 w-full" />
          <SkeletonBar className="h-20 w-full" />
        </div>
      );
    case "vendors":
      return (
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
          <div className="flex gap-3">
            <SkeletonBar className="h-36 w-40" />
            <SkeletonBar className="h-36 w-40" />
          </div>
        </div>
      );
    case "activity":
      return (
        <div className="space-y-3 rounded-xl border border-[#e6dfd5] bg-white p-4">
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
        <div className="rounded-xl border border-[#e6dfd5] bg-white p-4">
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

function resolveInitialTab(initialTab: string | null | undefined): EventDetailTab {
  if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
    return initialTab as EventDetailTab;
  }
  return "overview";
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
  onInviteTeamMember,
  inviteCollaborators = [],
  workspace = {},
  approvalsSlot,
  initialTab = null,
  showYoureSet = false,
}: EventDetailShellProps) {
  const [tab, setTab] = useState<EventDetailTab>(() =>
    resolveInitialTab(initialTab),
  );
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
  const tabLoadAbortRef = useRef<AbortController | null>(null);

  const syncTabUrl = useCallback(
    (nextTab: EventDetailTab) => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (nextTab === "overview") {
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
    setTab(resolveInitialTab(initialTab));
  }, [event.id, initialTab]);

  useEffect(() => {
    if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
      setTab(initialTab as EventDetailTab);
    } else if (!initialTab) {
      setTab("overview");
    }
  }, [initialTab]);

  const selectTab = useCallback(
    (nextTab: EventDetailTab) => {
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
    // Community always needs vendors data when open.
    if (COMMUNITY_TABS.includes(tab)) {
      ensureTabLoaded("vendors");
    }
  }, [tab, ensureTabLoaded]);

  const invalidateEventTab = useCallback(
    async (tabToRefresh: EventDetailLazyTab) => {
      const requestEventId = event.id;
      const cacheKey = eventTabCacheKey(requestEventId, tabToRefresh);
      invalidateEventTabCacheEntry(
        tabCacheRef.current,
        requestEventId,
        tabToRefresh,
      );
      fetchInFlightRef.current.delete(cacheKey);

      if (invalidateInFlightRef.current.has(cacheKey)) {
        return { success: true as const };
      }
      invalidateInFlightRef.current.add(cacheKey);
      setRefreshingTab(tabToRefresh);
      setRefreshError(null);

      try {
        const result = await loadEventDetailTabAction(
          requestEventId,
          tabToRefresh,
        );
        if (cacheEventIdRef.current !== requestEventId) {
          return { success: false as const, error: "Event changed." };
        }
        if (!result.success) {
          setRefreshError(result.error);
          return { success: false as const, error: result.error };
        }

        setEventTabCacheEntry(tabCacheRef.current, cacheKey, result.data);
        applyTabData(result.data);
        setLoadedTabs((prev) => new Set(prev).add(tabToRefresh));

        if (tabAffectsHeroStats(tabToRefresh)) {
          const statsResult =
            await refreshEventDetailHeroStatsAction(requestEventId);
          if (
            cacheEventIdRef.current === requestEventId &&
            statsResult.success
          ) {
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
        if (cacheEventIdRef.current === requestEventId) {
          setRefreshError(message);
        }
        return { success: false as const, error: message };
      } finally {
        invalidateInFlightRef.current.delete(cacheKey);
        if (cacheEventIdRef.current === requestEventId) {
          setRefreshingTab((current) =>
            current === tabToRefresh ? null : current,
          );
        }
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

  const isPlanning = PLANNING_TABS.includes(tab);
  const isCommunity = COMMUNITY_TABS.includes(tab);

  const showTabLoading =
    LAZY_TABS.has(tab) &&
    !loadedTabs.has(tab) &&
    !(tab === "approvals" && approvalsSlot) &&
    !isCommunity &&
    (pending || !tabError);

  return (
    <EventDetailTabInvalidationProvider value={invalidationValue}>
    <div className="studio-page relative space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {tab === "overview" ? (
          <Link
            href="/events"
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              ew.inksoft,
              "hover:text-[#1c352d]",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Events
          </Link>
        ) : (
          <EventWorkspaceContextHeader
            eventTitle={event.title}
            onBackToEvent={() => selectTab("overview")}
          />
        )}
        {onInviteTeamMember ? (
          <button
            type="button"
            onClick={onInviteTeamMember}
            data-testid="event-invite-team-member"
            className="inline-flex items-center gap-2 rounded-full bg-[#e6efe9] px-5 py-2 text-xs font-semibold text-[#5a7568] shadow-sm transition-all hover:bg-[#8ea89d] hover:text-white"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            Invite Team
          </button>
        ) : null}
      </div>

      {showYoureSet ? (
        <OnboardingYoureSetToast eventTitle={event.title} />
      ) : null}

      {tab === "overview" ? (
        <EventWorkspaceOverviewPanel
          event={event}
          artwork={artwork}
          stats={liveHeroStats}
          responsibilities={responsibilities}
          inviteCollaborators={inviteCollaborators}
          onSelectTab={selectTab}
          onInviteTeamMember={onInviteTeamMember}
        />
      ) : null}

      {tab !== "overview" ? (
      <div>
        {tab === "create-with-ai" ? (
          <p
            className={cn("mb-4 font-display text-2xl", ew.ink)}
            data-testid="event-detail-tab-create-with-ai"
          >
            Create with AI
          </p>
        ) : null}

        {tabError && LAZY_TABS.has(tab) && !loadedTabs.has(tab) && !isCommunity ? (
          <div className="rounded-xl border border-[#e6dfd5] bg-white p-4">
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
          <div className="mb-3 rounded-xl border border-[#e6dfd5] bg-white p-3">
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
          <p className="mb-2 text-xs text-[#5e6b65]" aria-live="polite">
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

          {isCommunity ? (
            <EventCommunityPanel
              section={tab === "vendors" ? "vendors" : "responsibilities"}
              responsibilities={responsibilities}
              inviteCollaborators={inviteCollaborators}
              canManageAssignments={canManageAssignments}
              onManageAssignments={onManageAssignments}
              onInviteTeamMember={onInviteTeamMember}
              eventId={event.id}
              vendorsData={
                panelData.eventVendorsData ?? {
                  vendors: [],
                  canWrite: false,
                }
              }
              vendorsReady={loadedTabs.has("vendors")}
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

          {isPlanning ? (
            <EventPlanningShell
              active={tab as "tasks" | "notes" | "files"}
              taskCount={liveHeroStats.tasks}
              noteCount={
                loadedTabs.has("notes") ? (panelData.notes?.length ?? 0) : null
              }
              fileCount={
                loadedTabs.has("files")
                  ? (panelData.filesPageData?.files?.length ?? 0)
                  : null
              }
              onSelect={(next) => selectTab(next)}
            >
              {tab === "tasks" && loadedTabs.has("tasks") ? (
                panelData.tasksV2Data ? (
                  <Suspense
                    fallback={
                      <div className="min-h-[16rem] animate-pulse rounded-xl bg-[#f4f0ea]" />
                    }
                  >
                    <EventDetailTasksEasePanel data={panelData.tasksV2Data} />
                  </Suspense>
                ) : (
                  <div className="rounded-xl border border-[#e6dfd5] bg-white p-6">
                    <h3 className={cn("font-display text-lg", ew.ink)}>
                      Tasks unavailable
                    </h3>
                    <p className={cn("mt-1 text-sm", ew.inksoft)}>
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
            </EventPlanningShell>
          ) : null}

          {tab === "volunteers" ? (
            <EventDetailVolunteersEasePanel event={event} />
          ) : null}

          {tab === "activity" && loadedTabs.has("activity") ? (
            <div
              className="rounded-2xl border border-[#e6dfd5] bg-white p-4 sm:p-6"
              data-testid="event-detail-tab-activity"
            >
              <EventDetailActivityEasePanel items={activityItems} />
            </div>
          ) : null}

          {tab === "insights" &&
          panelData.insightsData &&
          loadedTabs.has("insights") ? (
            <div
              className="rounded-2xl border border-[#e6dfd5] bg-[#faf8f5] p-2 sm:p-4"
              data-testid="event-detail-tab-insights"
            >
              <EventDetailInsightsEasePanel data={panelData.insightsData} />
            </div>
          ) : null}
      </div>
      ) : null}
    </div>
    </EventDetailTabInvalidationProvider>
  );
}

/** Fallback availability marker for regression tests. */
export const EVENT_DETAIL_FALLBACK_EXPORT = "EventPlanningHub";
