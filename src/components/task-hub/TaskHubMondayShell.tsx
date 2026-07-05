"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { TaskHubCalendar } from "@/components/task-hub/TaskHubCalendar";
import { TaskHubMondayBoard } from "@/components/task-hub/TaskHubMondayBoard";
import { cn } from "@/lib/utils/cn";
import type { TaskHubMondayViewMode, TaskHubPageData } from "@/types/task-hub";
import {
  CalendarDays,
  GanttChart,
  Kanban,
  LayoutGrid,
  Table2,
  Timeline,
} from "lucide-react";

const MONDAY_VIEW_TABS: {
  id: TaskHubMondayViewMode;
  label: string;
  icon: typeof LayoutGrid;
  ready: boolean;
}[] = [
  { id: "main_table", label: "Main table", icon: Table2, ready: true },
  { id: "event_timeline", label: "Event Timeline", icon: Timeline, ready: false },
  { id: "gantt", label: "Gantt", icon: GanttChart, ready: false },
  { id: "calendar", label: "Calendar", icon: CalendarDays, ready: true },
  { id: "kanban", label: "Kanban", icon: Kanban, ready: false },
  { id: "table", label: "Table", icon: LayoutGrid, ready: false },
];

function parseMondayView(value: string | null): TaskHubMondayViewMode {
  const valid = MONDAY_VIEW_TABS.map((tab) => tab.id);
  if (value && valid.includes(value as TaskHubMondayViewMode)) {
    return value as TaskHubMondayViewMode;
  }
  return "main_table";
}

interface TaskHubMondayShellProps {
  data: TaskHubPageData;
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="cos-card py-16 text-center">
      <p className="font-display text-xl text-cos-text">{label}</p>
      <p className="mt-2 text-sm text-cos-muted">Coming soon — use Main table for now.</p>
    </div>
  );
}

export function TaskHubMondayShell({ data }: TaskHubMondayShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const board = data.mondayBoard!;

  const activeView = parseMondayView(searchParams.get("mview"));

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

  const content = useMemo(() => {
    switch (activeView) {
      case "calendar":
        return data.committees.length > 0 ? (
          <TaskHubCalendar data={data} />
        ) : (
          <ComingSoon label="Calendar" />
        );
      case "event_timeline":
        return <ComingSoon label="Event Timeline" />;
      case "gantt":
        return <ComingSoon label="Gantt" />;
      case "kanban":
        return <ComingSoon label="Kanban" />;
      case "table":
        return <ComingSoon label="Table" />;
      default:
        return (
          <TaskHubMondayBoard
            board={board}
            canEdit={data.canEdit}
            orgMembers={data.orgMembers}
            events={data.events}
          />
        );
    }
  }, [activeView, board, data]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-xs text-cos-muted">
          Synced from <span className="font-medium text-cos-text">{board.boardName}</span>
        </p>
      </div>

      <div className="mb-6">
        <div
          className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-md border border-cos-border bg-cos-bg p-1"
          role="tablist"
          aria-label="Monday board views"
        >
          {MONDAY_VIEW_TABS.map((tab) => {
            const isActive = activeView === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() =>
                  replaceParams({
                    mview: tab.id === "main_table" ? null : tab.id,
                    view: null,
                  })
                }
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                  !tab.ready && !isActive && "opacity-70",
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
