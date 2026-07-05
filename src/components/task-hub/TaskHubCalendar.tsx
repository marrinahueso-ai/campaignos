"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  List,
  Rows3,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { updateTaskHubTaskStatusAction } from "@/lib/task-hub/actions";
import {
  effectiveTaskDueDate,
  flattenCommitteeTasks,
  groupTasksForCalendar,
} from "@/lib/task-hub/grouping";
import { nextTaskStatus, taskStatusLabel } from "@/lib/event-playbooks/task-status";
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
} from "@/lib/communications-calendar/workload";
import {
  formatEventDate,
  getTodayDateString,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubPageData, TaskHubTaskItem } from "@/types/task-hub";

interface TaskHubCalendarProps {
  data: TaskHubPageData;
}

type CalendarGranularity = "week" | "month";

export function TaskHubCalendar({ data }: TaskHubCalendarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = getTodayDateString();
  const parsedToday = parseLocalDate(today);
  const [granularity, setGranularity] = useState<CalendarGranularity>("month");
  const [year, setYear] = useState(parsedToday.getFullYear());
  const [month, setMonth] = useState(parsedToday.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});

  const allTasks = useMemo(
    () => flattenCommitteeTasks(data.committees),
    [data.committees],
  );

  const committeeByTaskId = useMemo(() => {
    const map = new Map<string, string>();
    for (const committee of data.committees) {
      for (const task of committee.tasks) {
        map.set(task.id, committee.committeeName);
      }
    }
    return map;
  }, [data.committees]);

  useEffect(() => {
    setTaskStatuses({});
  }, [data.committees]);

  const filteredTasks = useMemo(() => {
    if (granularity === "month") {
      const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
      return allTasks.filter((task) =>
        effectiveTaskDueDate(task).startsWith(monthKey),
      );
    }

    const weekStart = parseLocalDate(weekAnchor);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const start = toLocalDateString(weekStart);
    const end = toLocalDateString(weekEnd);

    return allTasks.filter((task) => {
      const due = effectiveTaskDueDate(task);
      return due >= start && due <= end;
    });
  }, [allTasks, granularity, month, weekAnchor, year]);

  const grouped = useMemo(
    () => groupTasksForCalendar(filteredTasks, granularity),
    [filteredTasks, granularity],
  );

  const periodLabel =
    granularity === "month"
      ? formatMonthLabel(year, month)
      : grouped[0]?.label ?? "This week";

  function resolveStatus(task: TaskHubTaskItem): EventPlaybookTaskStatus {
    return taskStatuses[task.id] ?? task.status;
  }

  function handleToggleStatus(task: TaskHubTaskItem) {
    const current = resolveStatus(task);
    const status = nextTaskStatus(current);
    setTaskStatuses((currentMap) => ({ ...currentMap, [task.id]: status }));

    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        status,
        task.title,
      );
      if (!result.success) {
        setTaskStatuses((currentMap) => {
          const next = { ...currentMap };
          delete next[task.id];
          return next;
        });
        return;
      }
      router.refresh();
    });
  }

  function goPrevious() {
    if (granularity === "month") {
      const next = addMonths(year, month, -1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    setWeekAnchor(addWeeks(weekAnchor, -1));
  }

  function goNext() {
    if (granularity === "month") {
      const next = addMonths(year, month, 1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    setWeekAnchor(addWeeks(weekAnchor, 1));
  }

  function goToday() {
    const now = parseLocalDate(getTodayDateString());
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setWeekAnchor(getTodayDateString());
  }

  if (allTasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No tasks on the timeline"
        description="Tasks with due dates (or event dates as fallback) appear here."
        className="cos-card py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card padding="md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-cos-muted uppercase">
              Timeline
            </p>
            <h2 className="mt-1 font-display text-2xl text-cos-text">{periodLabel}</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Grouped by {granularity === "month" ? "month" : "week"} · due date
              with event date fallback
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border border-cos-border bg-cos-bg p-1">
              <button
                type="button"
                onClick={() => setGranularity("month")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  granularity === "month"
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Month
              </button>
              <button
                type="button"
                onClick={() => setGranularity("week")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  granularity === "week"
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                <Rows3 className="h-4 w-4" />
                Week
              </button>
            </div>

            <Button type="button" variant="secondary" size="sm" onClick={goPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={goToday}>
              Today
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={goNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={List}
          title="Nothing due in this period"
          description="Navigate to another week or month to see upcoming tasks."
          className="cos-card py-12"
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <Card key={group.key} padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-cos-border bg-cos-bg px-4 py-3">
                <h3 className="text-sm font-medium text-cos-text">{group.label}</h3>
                <Badge variant="default">{group.tasks.length}</Badge>
              </div>
              <ul className="divide-y divide-cos-border">
                {group.tasks.map((task) => {
                  const status = resolveStatus(task);
                  const committeeName = committeeByTaskId.get(task.id);

                  return (
                    <li
                      key={task.id}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
                    >
                      <div className="w-36 shrink-0 text-xs text-cos-muted">
                        {formatEventDate(effectiveTaskDueDate(task))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(task)}
                            disabled={pending}
                            className="text-left text-sm text-cos-text hover:underline disabled:opacity-50"
                          >
                            {task.title}
                          </button>
                          <Badge
                            variant={
                              status === "done"
                                ? "success"
                                : status === "blocked"
                                  ? "warning"
                                  : status === "in_progress"
                                    ? "info"
                                    : "default"
                            }
                          >
                            {taskStatusLabel(status)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cos-muted">
                          {committeeName && <span>{committeeName}</span>}
                          <Link
                            href={task.event.eventHref}
                            className="inline-flex items-center gap-1 hover:text-cos-text"
                          >
                            {task.event.eventTitle}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
