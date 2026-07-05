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
import { TaskHubBoard } from "@/components/task-hub/TaskHubBoard";
import { TaskHubCalendar } from "@/components/task-hub/TaskHubCalendar";
import { TaskHubList } from "@/components/task-hub/TaskHubList";
import { cn } from "@/lib/utils/cn";
import type {
  TaskHubPageData,
  TaskHubSecondaryGroupMode,
  TaskHubViewMode,
} from "@/types/task-hub";
import { LayoutGrid, List, CalendarDays, ListChecks } from "lucide-react";

const VIEW_TABS: {
  id: TaskHubViewMode;
  label: string;
  icon: typeof List;
}[] = [
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

function parseViewMode(value: string | null): TaskHubViewMode {
  if (value === "board" || value === "calendar") {
    return value;
  }
  return "list";
}

function parseSecondaryGroup(value: string | null): TaskHubSecondaryGroupMode {
  if (value === "status" || value === "assignee" || value === "due_date") {
    return value;
  }
  return "none";
}

interface TaskHubShellProps {
  data: TaskHubPageData;
}

export function TaskHubShell({ data }: TaskHubShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeView = parseViewMode(searchParams.get("view"));
  const secondaryGroupMode = parseSecondaryGroup(searchParams.get("group"));

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

  const handleSecondaryGroupChange = useCallback(
    (mode: TaskHubSecondaryGroupMode) => {
      replaceParams({ group: mode === "none" ? null : mode });
    },
    [replaceParams],
  );

  const content = useMemo(() => {
    if (!data.tablesAvailable) {
      return (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Task hub unavailable</CardTitle>
            <CardDescription>
              Run migration 031_event_playbook_tables.sql to enable cross-event task
              tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    if (data.committees.length === 0) {
      return (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description={
            data.scope === "chaired_committees"
              ? "Tasks from your committee events will appear here once playbook checklists are created."
              : "Playbook tasks from active campaigns will appear here, grouped by committee."
          }
          className="cos-card py-16"
        />
      );
    }

    switch (activeView) {
      case "board":
        return <TaskHubBoard data={data} />;
      case "calendar":
        return <TaskHubCalendar data={data} />;
      default:
        return (
          <TaskHubList
            data={data}
            secondaryGroupMode={secondaryGroupMode}
            onSecondaryGroupChange={handleSecondaryGroupChange}
          />
        );
    }
  }, [activeView, data, handleSecondaryGroupChange, secondaryGroupMode]);

  return (
    <>
      <div className="mb-6">
        <div
          className="inline-flex gap-0.5 overflow-x-auto rounded-md border border-cos-border bg-cos-bg p-1"
          role="tablist"
          aria-label="Task hub views"
        >
          {VIEW_TABS.map((tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => replaceParams({ view: tab.id === "list" ? null : tab.id })}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {content}
    </>
  );
}
