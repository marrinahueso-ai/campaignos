"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ListChecks } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TasksV2ComingSoon } from "@/components/tasks-v2/TasksV2ComingSoon";
import { TasksV2FooterLegend } from "@/components/tasks-v2/TasksV2FooterLegend";
import { TasksV2MainTable } from "@/components/tasks-v2/TasksV2MainTable";
import { TasksV2Sidebar } from "@/components/tasks-v2/TasksV2Sidebar";
import { TasksV2SummaryCards } from "@/components/tasks-v2/TasksV2SummaryCards";
import { TasksV2Tabs, parseTasksV2Tab } from "@/components/tasks-v2/TasksV2Tabs";
import { eventGroupAccentColor } from "@/lib/tasks-v2/event-colors";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import { computeTasksV2SummaryStats } from "@/lib/tasks-v2/summary-stats";
import { cn } from "@/lib/utils/cn";
import type {
  TasksV2EventGroup,
  TasksV2PageData,
  TasksV2ViewTab,
} from "@/types/tasks-v2";

const COMING_SOON_LABELS: Partial<Record<TasksV2ViewTab, string>> = {
  my_tasks: "My Tasks",
  calendar: "Calendar",
  kanban: "Kanban",
  timeline: "Timeline",
  workload: "Workload",
  files: "Files",
};

interface TasksV2ShellProps {
  data: TasksV2PageData;
  /** Soft filter from SSR (`/tasks?event=`). Overridden by lockedEventId. */
  initialEventFilter?: string | null;
  /** Hard-lock table + AI generator to one event (Event Detail Tasks tab). */
  lockedEventId?: string | null;
  /** Compact chrome for embedding inside Event Detail. */
  embedded?: boolean;
}

function buildEmptyEventGroup(
  eventId: string,
  eventTitle: string,
  eventDate: string,
): TasksV2EventGroup {
  return {
    eventId,
    eventTitle,
    eventDate,
    eventHref: `/events/${eventId}`,
    accentColor: eventGroupAccentColor(eventId, 0),
    tasks: [],
    doneCount: 0,
    totalCount: 0,
  };
}

export function TasksV2Shell({
  data,
  initialEventFilter = null,
  lockedEventId = null,
  embedded = false,
}: TasksV2ShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lockedId = lockedEventId?.trim() || null;
  const [localTab, setLocalTab] = useState<TasksV2ViewTab>("main_table");

  const activeTab = embedded
    ? localTab
    : parseTasksV2Tab(searchParams.get("tab"));

  const eventFilter =
    lockedId ??
    searchParams.get("event") ??
    (initialEventFilter?.trim() || null);

  const replaceParams = useCallback(
    (updates: Record<string, string | null>) => {
      if (embedded) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.replace(query ? `/tasks?${query}` : "/tasks", { scroll: false });
    },
    [embedded, router, searchParams],
  );

  const handleTabChange = useCallback(
    (tab: TasksV2ViewTab) => {
      if (embedded) {
        setLocalTab(tab);
        return;
      }
      replaceParams({
        tab: tab === "main_table" ? null : tab,
        view: null,
        mview: null,
      });
    },
    [embedded, replaceParams],
  );

  const eventsWithLocked = useMemo(() => {
    if (!lockedId) {
      return data.events;
    }
    if (data.events.some((event) => event.eventId === lockedId)) {
      return data.events;
    }
    const fromGroup = data.eventGroups.find((group) => group.eventId === lockedId);
    if (!fromGroup) {
      return data.events;
    }
    return [
      ...data.events,
      {
        eventId: fromGroup.eventId,
        eventTitle: fromGroup.eventTitle,
        eventDate: fromGroup.eventDate,
      },
    ];
  }, [data.eventGroups, data.events, lockedId]);

  const scopedEventGroups = useMemo(() => {
    if (!eventFilter) {
      return data.eventGroups;
    }

    const matched = data.eventGroups.filter(
      (group) => group.eventId === eventFilter,
    );
    if (matched.length > 0) {
      return matched;
    }

    const option = eventsWithLocked.find((event) => event.eventId === eventFilter);
    if (!option) {
      return [];
    }

    return [
      buildEmptyEventGroup(option.eventId, option.eventTitle, option.eventDate),
    ];
  }, [data.eventGroups, eventFilter, eventsWithLocked]);

  const scopedSummary = useMemo(
    () => computeTasksV2SummaryStats(flattenEventGroups(scopedEventGroups)),
    [scopedEventGroups],
  );

  const mainContent = useMemo(() => {
    if (!data.tablesAvailable) {
      return (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Tasks unavailable</CardTitle>
            <CardDescription>
              Run migration 031_event_playbook_tables.sql to enable cross-event task
              tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    if (scopedEventGroups.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description={
            eventFilter
              ? "Generate tasks with AI or add one manually for this event."
              : "Tasks from your campaigns and events will appear here, grouped by event."
          }
          className="border border-cos-border bg-cos-card py-16"
        />
      );
    }

    if (activeTab !== "main_table") {
      const label = COMING_SOON_LABELS[activeTab] ?? "View";
      return <TasksV2ComingSoon label={label} />;
    }

    return (
      <TasksV2MainTable
        eventGroups={scopedEventGroups}
        canEdit={data.canEdit}
        events={eventsWithLocked}
        orgMembers={data.orgMembers}
      />
    );
  }, [
    activeTab,
    data.canEdit,
    data.orgMembers,
    data.tablesAvailable,
    eventFilter,
    eventsWithLocked,
    scopedEventGroups,
  ]);

  const globalTasksHref = eventFilter
    ? `/tasks?event=${encodeURIComponent(eventFilter)}`
    : "/tasks";

  return (
    <div className={cn(embedded ? "space-y-4" : "space-y-6")}>
      <header
        className={cn(
          "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
          embedded ? "gap-4" : "gap-6",
        )}
      >
        <div className="min-w-0">
          {!embedded ? (
            <>
              <h1 className="font-display text-3xl text-cos-text">Tasks</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
                Organize work, assign tasks, and track progress across all campaigns and
                events.
              </p>
            </>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-cos-text">Tasks</h2>
                <p className="mt-1 text-sm text-cos-muted">
                  Tasks for this event — same workspace as the Tasks page.
                </p>
              </div>
              <Link
                href={globalTasksHref}
                className="inline-flex shrink-0 items-center gap-1.5 text-sm text-cos-muted transition-colors hover:text-cos-text"
              >
                Open in Tasks
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </div>
          )}
        </div>
        {!embedded ? (
          <div className="w-full lg:max-w-md lg:shrink-0">
            <TasksV2SummaryCards summary={scopedSummary} />
          </div>
        ) : null}
      </header>

      {!embedded ? (
        <TasksV2Tabs activeTab={activeTab} onTabChange={handleTabChange} />
      ) : null}

      <div
        className={cn(
          "grid gap-6",
          embedded
            ? "xl:grid-cols-[minmax(0,1fr)_17rem]"
            : "xl:grid-cols-[minmax(0,1fr)_18rem]",
        )}
      >
        <div className="min-w-0">{mainContent}</div>
        <TasksV2Sidebar
          eventGroups={scopedEventGroups}
          events={eventsWithLocked}
          canEdit={data.canEdit}
          aiAvailable={data.aiAvailable}
          aiUnavailableReason={data.aiUnavailableReason}
          preferredEventId={eventFilter}
          lockedEventId={lockedId}
          hideMyViews={Boolean(lockedId || embedded)}
        />
      </div>

      {!embedded ? <TasksV2FooterLegend /> : null}
    </div>
  );
}
