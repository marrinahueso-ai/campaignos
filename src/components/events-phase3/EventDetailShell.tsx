"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Users,
} from "lucide-react";
import { EventVolunteersTab } from "@/components/events-phase3/EventVolunteersTab";
import { EventDetailHero } from "@/components/events-phase3/EventDetailHero";
import type { EventDetailHeroStats } from "@/components/events-phase3/EventDetailHero";
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
import { loadEventDetailTabAction } from "@/lib/events-phase3/actions";
import type { EventDetailTabData } from "@/lib/events-phase3/tab-loaders";
import type { UnifiedApprovalsPageData } from "@/lib/approvals-scheduling/types";
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

export type EventDetailTab =
  | "responsibilities"
  | "create-with-ai"
  | "approvals"
  | "tasks"
  | "files"
  | "notes"
  | "volunteers"
  | "vendors"
  | "activity";

const TABS: { id: EventDetailTab; label: string }[] = [
  { id: "responsibilities", label: "Responsibilities" },
  { id: "create-with-ai", label: "Create with AI" },
  { id: "approvals", label: "Approvals" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "notes", label: "Notes" },
  { id: "volunteers", label: "Volunteers" },
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

function TabLoadingState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-cos-border bg-cos-card p-6">
      <div className="min-h-[12rem] animate-pulse rounded-lg bg-cos-bg/60" />
      <p className="mt-3 text-sm text-cos-muted">Loading {label}…</p>
    </div>
  );
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
    if (initialTab === "create-with-ai") {
      return "create-with-ai";
    }
    if (initialTab && VALID_TABS.has(initialTab as EventDetailTab)) {
      return initialTab as EventDetailTab;
    }
    return "responsibilities";
  });
  const [panelData, setPanelData] = useState<EventDetailWorkspacePanels>(workspace);
  const [loadedTabs, setLoadedTabs] = useState<Set<EventDetailTab>>(() => {
    const initial = new Set<EventDetailTab>();
    if (workspace.approvalsData) initial.add("approvals");
    if (workspace.tasksV2Data) initial.add("tasks");
    if (workspace.filesPageData) initial.add("files");
    if (workspace.notes) initial.add("notes");
    if (workspace.eventVendorsData || workspace.vendorDirectory) {
      initial.add("vendors");
    }
    if (workspace.playbookActivity || workspace.workspaceTimeline) {
      initial.add("activity");
    }
    return initial;
  });
  const [tabError, setTabError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const createWithAiUrl = createWithAiHref(event.id);
  const eventTypeLabel = event.eventType
    ? (EVENT_TYPE_LABELS[event.eventType] ?? null)
    : null;

  useEffect(() => {
    if (initialTab === "create-with-ai") {
      router.replace(createWithAiUrl);
    }
  }, [initialTab, event.id, router, createWithAiUrl]);

  const ensureTabLoaded = useCallback(
    (nextTab: EventDetailTab) => {
      if (!LAZY_TABS.has(nextTab) || loadedTabs.has(nextTab)) {
        return;
      }

      setTabError(null);
      startTransition(async () => {
        const result = await loadEventDetailTabAction(event.id, nextTab);
        if (!result.success) {
          setTabError(result.error);
          return;
        }
        applyTabData(result.data);
        setLoadedTabs((prev) => new Set(prev).add(nextTab));
      });
    },
    [event.id, loadedTabs],
  );

  function applyTabData(data: EventDetailTabData) {
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
        default:
          return prev;
      }
    });
  }

  useEffect(() => {
    ensureTabLoaded(tab);
  }, [tab, ensureTabLoaded]);

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
    <div className="studio-page space-y-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-sm text-cos-muted hover:text-cos-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Events
            <span className="text-cos-border">›</span>
            <span className="truncate text-cos-text">{event.title}</span>
          </Link>
          <h1 className="mt-3 font-display text-3xl text-cos-text sm:text-4xl">
            {event.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-cos-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {formatEventDate(event.date)}
            </span>
            {event.time ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatEventTime(event.time)}
              </span>
            ) : null}
            {eventTypeLabel ? <Badge variant="default">{eventTypeLabel}</Badge> : null}
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
        stats={heroStats}
      />

      <div className="border-b border-cos-border">
        <nav className="-mb-px flex flex-wrap gap-1" aria-label="Event sections">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setTab(entry.id);
              }}
              className={cn(
                "border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                tab === entry.id
                  ? "border-cos-text text-cos-text"
                  : "border-transparent text-cos-muted hover:text-cos-text",
              )}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tabError && LAZY_TABS.has(tab) && !loadedTabs.has(tab) ? (
          <div className="rounded-xl border border-cos-border bg-cos-card p-6">
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
              Try again
            </Button>
          </div>
        ) : null}

        {showTabLoading ? (
          <TabLoadingState
            label={TABS.find((entry) => entry.id === tab)?.label ?? "section"}
          />
        ) : null}

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

          {tab === "create-with-ai" ? (
            <div className="rounded-xl border border-cos-border bg-white p-6">
              <h3 className="font-display text-xl text-cos-text">
                Create with AI
              </h3>
              <p className="mt-2 text-sm text-cos-muted">
                Opening Create with AI for{" "}
                <span className="font-medium text-cos-text">{event.title}</span>
                …
              </p>
              <Button href={createWithAiUrl} className="mt-4">
                Continue to Create with AI
              </Button>
            </div>
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
      </div>
    </div>
  );
}

/** Fallback availability marker for regression tests. */
export const EVENT_DETAIL_FALLBACK_EXPORT = "EventPlanningHub";
