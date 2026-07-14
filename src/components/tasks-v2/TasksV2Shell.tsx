"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
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
import type { TasksV2PageData, TasksV2ViewTab } from "@/types/tasks-v2";
import { ListChecks } from "lucide-react";

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
}

export function TasksV2Shell({ data }: TasksV2ShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseTasksV2Tab(searchParams.get("tab"));
  const eventFilter = searchParams.get("event");

  const replaceParams = useCallback(
    (updates: Record<string, string | null>) => {
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
    [router, searchParams],
  );

  const handleTabChange = useCallback(
    (tab: TasksV2ViewTab) => {
      replaceParams({
        tab: tab === "main_table" ? null : tab,
        view: null,
        mview: null,
      });
    },
    [replaceParams],
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

    if (data.eventGroups.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description="Tasks from your campaigns and events will appear here, grouped by event."
          className="border border-cos-border bg-cos-card py-16"
        />
      );
    }

    if (activeTab !== "main_table") {
      const label = COMING_SOON_LABELS[activeTab] ?? "View";
      return <TasksV2ComingSoon label={label} />;
    }

    const eventGroups = eventFilter
      ? data.eventGroups.filter((group) => group.eventId === eventFilter)
      : data.eventGroups;

    return (
      <TasksV2MainTable
        eventGroups={eventGroups}
        canEdit={data.canEdit}
        events={data.events}
        orgMembers={data.orgMembers}
      />
    );
  }, [activeTab, data, eventFilter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl text-cos-text">Tasks</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cos-muted">
            Organize work, assign tasks, and track progress across all campaigns and
            events.
          </p>
        </div>
        <div className="w-full lg:max-w-md lg:shrink-0">
          <TasksV2SummaryCards summary={data.summary} />
        </div>
      </header>

      <TasksV2Tabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0">{mainContent}</div>
        <TasksV2Sidebar
          eventGroups={data.eventGroups}
          events={data.events}
          canEdit={data.canEdit}
          aiAvailable={data.aiAvailable}
          aiUnavailableReason={data.aiUnavailableReason}
          preferredEventId={eventFilter}
        />
      </div>

      <TasksV2FooterLegend />
    </div>
  );
}
