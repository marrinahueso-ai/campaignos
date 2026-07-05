"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import {
  countTasksByStatus,
  TaskHubStatusSummaryBar,
} from "@/components/task-hub/TaskHubStatusSummaryBar";
import { TaskHubTable } from "@/components/task-hub/TaskHubTable";
import { TaskHubTaskRow } from "@/components/task-hub/TaskHubTaskRow";
import { TaskHubToolbar } from "@/components/task-hub/TaskHubToolbar";
import {
  reorderTaskHubTasksAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import {
  buildCommitteeOrderMap,
  groupTasksBySecondary,
  reorderCommitteeTasks,
  resolveTaskDisplayStatus,
} from "@/lib/task-hub/grouping";
import {
  filterAndSortTasks,
  type TaskHubSortMode,
  type TaskHubStatusFilter,
} from "@/lib/task-hub/list-filters";
import { nextTaskStatus } from "@/lib/event-playbooks/task-status";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type {
  TaskHubCommitteeGroup,
  TaskHubPageData,
  TaskHubSecondaryGroupMode,
  TaskHubTaskItem,
} from "@/types/task-hub";

interface TaskHubListProps {
  data: TaskHubPageData;
  secondaryGroupMode: TaskHubSecondaryGroupMode;
  onSecondaryGroupChange: (mode: TaskHubSecondaryGroupMode) => void;
}

function committeeKey(group: TaskHubCommitteeGroup): string {
  return group.committeeId ?? group.committeeName;
}

export function TaskHubList({
  data,
  secondaryGroupMode,
  onSecondaryGroupChange,
}: TaskHubListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [committees, setCommittees] = useState(data.committees);
  const [collapsedCommittees, setCollapsedCommittees] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedSecondary, setCollapsedSecondary] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragCommitteeKey, setDragCommitteeKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<TaskHubSortMode>("default");
  const [statusFilter, setStatusFilter] = useState<TaskHubStatusFilter>("all");

  useEffect(() => {
    setCommittees(data.committees);
  }, [data.committees]);

  const totalTaskCount = useMemo(
    () => committees.reduce((sum, group) => sum + group.tasks.length, 0),
    [committees],
  );

  const filteredTaskCount = useMemo(() => {
    return committees.reduce((sum, group) => {
      const filtered = filterAndSortTasks(group.tasks, {
        searchQuery,
        statusFilter,
        sortMode,
        statusOverrides: taskStatuses,
      });
      return sum + filtered.length;
    }, 0);
  }, [committees, searchQuery, sortMode, statusFilter, taskStatuses]);

  function resolveTaskStatus(
    taskId: string,
    fallback: EventPlaybookTaskStatus,
  ): EventPlaybookTaskStatus {
    return taskStatuses[taskId] ?? fallback;
  }

  function toggleCommitteeCollapsed(key: string) {
    setCollapsedCommittees((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSecondaryCollapsed(key: string) {
    setCollapsedSecondary((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleToggleStatus(task: TaskHubTaskItem, currentStatus: EventPlaybookTaskStatus) {
    if (pendingTaskIds.has(task.id)) {
      return;
    }

    const status = nextTaskStatus(currentStatus);
    setTaskStatuses((current) => ({ ...current, [task.id]: status }));
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        status,
        task.title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });

      if (!result.success) {
        setTaskStatuses((current) => {
          const next = { ...current };
          delete next[task.id];
          return next;
        });
        return;
      }

      router.refresh();
    });
  }

  function persistCommitteeOrder(
    key: string,
    nextTasks: TaskHubTaskItem[],
    previousCommittees: TaskHubCommitteeGroup[],
  ) {
    setCommittees((current) =>
      current.map((group) =>
        committeeKey(group) === key ? { ...group, tasks: nextTasks } : group,
      ),
    );

    startTransition(async () => {
      const result = await reorderTaskHubTasksAction(
        nextTasks.map((task) => ({ id: task.id, eventId: task.eventId })),
      );
      if (!result.success) {
        setCommittees(previousCommittees);
      } else {
        router.refresh();
      }
    });
  }

  function handleTaskDrop(
    committee: TaskHubCommitteeGroup,
    taskId: string,
    targetIndex: number,
  ) {
    const key = committeeKey(committee);
    const previous = committees;
    const currentGroup = committees.find((group) => committeeKey(group) === key);
    if (!currentGroup) {
      return;
    }

    const nextTasks = reorderCommitteeTasks(currentGroup, taskId, targetIndex);
    persistCommitteeOrder(key, nextTasks, previous);
    setDragOverTaskId(null);
    setDragCommitteeKey(null);
  }

  function prepareTasks(tasks: TaskHubTaskItem[]): TaskHubTaskItem[] {
    return filterAndSortTasks(tasks, {
      searchQuery,
      statusFilter,
      sortMode,
      statusOverrides: taskStatuses,
    });
  }

  function renderTaskRows(
    committee: TaskHubCommitteeGroup,
    tasks: TaskHubTaskItem[],
  ) {
    const key = committeeKey(committee);
    const preparedTasks = prepareTasks(tasks);

    return preparedTasks.map((task, taskIndex) => {
      const status = resolveTaskStatus(task.id, task.status);
      const isPending = pendingTaskIds.has(task.id);

      return (
        <TaskHubTaskRow
          key={task.id}
          task={task}
          status={status}
          committeeName={committee.committeeName}
          isPending={isPending}
          disabled={pending}
          draggable={sortMode === "default"}
          showGrip={sortMode === "default"}
          dragOver={dragOverTaskId === task.id}
          onToggleStatus={() => handleToggleStatus(task, status)}
          onDragStart={(event) => {
            setTaskHubDragData(event, {
              taskId: task.id,
              committeeKey: key,
            });
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "move";
            setDragOverTaskId(task.id);
            setDragCommitteeKey(key);
          }}
          onDragLeave={() => {
            if (dragOverTaskId === task.id) {
              setDragOverTaskId(null);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const payload = readTaskHubDragPayload(event);
            if (payload?.committeeKey === key) {
              handleTaskDrop(committee, payload.taskId, taskIndex);
            }
          }}
        />
      );
    });
  }

  function renderCommitteeBody(group: TaskHubCommitteeGroup) {
    const key = committeeKey(group);
    const preparedTasks = prepareTasks(group.tasks);

    if (preparedTasks.length === 0) {
      return (
        <p className="px-4 py-6 text-center text-sm text-cos-muted">
          No tasks match your filters.
        </p>
      );
    }

    const secondaryGroups = groupTasksBySecondary(
      preparedTasks,
      secondaryGroupMode,
      group.chairName,
      taskStatuses,
    );

    return (
      <TaskHubTable>
        {secondaryGroupMode === "none"
          ? renderTaskRows(group, group.tasks)
          : secondaryGroups.flatMap((secondary) => {
              const secondaryKey = `${key}:${secondary.key}`;
              const secondaryCollapsed = collapsedSecondary.has(secondaryKey);

              return [
                <tr key={secondaryKey} className="bg-cos-bg/50">
                  <td colSpan={8} className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleSecondaryCollapsed(secondaryKey)}
                      className="inline-flex items-center gap-2 text-left"
                      aria-expanded={!secondaryCollapsed}
                    >
                      {secondaryCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5 text-cos-muted" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-cos-muted" />
                      )}
                      <span className="text-xs font-semibold tracking-wide text-cos-text uppercase">
                        {secondary.label}
                      </span>
                      <span className="rounded-full bg-cos-bg-alt px-2 py-0.5 text-[10px] font-medium text-cos-muted tabular-nums">
                        {secondary.tasks.length}
                      </span>
                    </button>
                  </td>
                </tr>,
                ...(!secondaryCollapsed ? renderTaskRows(group, secondary.tasks) : []),
              ];
            })}
      </TaskHubTable>
    );
  }

  const visibleCommittees = useMemo(() => {
    return committees.filter((group) => {
      const filtered = filterAndSortTasks(group.tasks, {
        searchQuery,
        statusFilter,
        sortMode,
        statusOverrides: taskStatuses,
      });
      return filtered.length > 0;
    });
  }, [committees, searchQuery, sortMode, statusFilter, taskStatuses]);

  return (
    <div className="space-y-4">
      <TaskHubToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortMode={sortMode}
        onSortChange={setSortMode}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        secondaryGroupMode={secondaryGroupMode}
        onSecondaryGroupChange={onSecondaryGroupChange}
        taskCount={totalTaskCount}
        filteredCount={filteredTaskCount}
      />

      {visibleCommittees.length === 0 ? (
        <div className="cos-card py-12 text-center text-sm text-cos-muted">
          No tasks match your search or filters.
        </div>
      ) : (
        visibleCommittees.map((group) => {
          const key = committeeKey(group);
          const collapsed = collapsedCommittees.has(key);
          const preparedTasks = prepareTasks(group.tasks);
          const statusCounts = countTasksByStatus(
            preparedTasks.map((task) => ({
              status: resolveTaskDisplayStatus(
                task,
                resolveTaskStatus(task.id, task.status),
              ),
            })),
          );

          return (
            <section
              key={key}
              className="cos-card overflow-hidden p-0"
            >
              <div className="flex items-center gap-3 border-b border-cos-border bg-gradient-to-r from-cos-bg to-cos-card px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleCommitteeCollapsed(key)}
                  className="inline-flex min-w-0 flex-1 items-center gap-2.5 text-left"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                  )}
                  <span className="truncate font-display text-lg text-cos-text">
                    {group.committeeName}
                  </span>
                  {group.chairName && (
                    <span className="hidden truncate text-xs text-cos-muted sm:inline">
                      · {group.chairName}
                    </span>
                  )}
                </button>

                <TaskHubStatusSummaryBar counts={statusCounts} />

                <span className="shrink-0 text-xs font-medium text-cos-muted tabular-nums">
                  {group.doneCount}/{group.totalCount}
                </span>
              </div>

              {!collapsed && (
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragCommitteeKey(key);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const payload = readTaskHubDragPayload(event);
                    if (payload?.committeeKey === key) {
                      handleTaskDrop(group, payload.taskId, group.tasks.length);
                    }
                  }}
                  className={cn(
                    dragCommitteeKey === key &&
                      !dragOverTaskId &&
                      "ring-1 ring-inset ring-cos-accent/40",
                  )}
                >
                  {renderCommitteeBody(group)}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

export { buildCommitteeOrderMap };
