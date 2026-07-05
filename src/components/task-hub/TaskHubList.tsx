"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import { TaskHubTaskRow } from "@/components/task-hub/TaskHubTaskRow";
import {
  reorderTaskHubTasksAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import {
  buildCommitteeOrderMap,
  groupTasksBySecondary,
  reorderCommitteeTasks,
} from "@/lib/task-hub/grouping";
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
}

function committeeKey(group: TaskHubCommitteeGroup): string {
  return group.committeeId ?? group.committeeName;
}

export function TaskHubList({ data, secondaryGroupMode }: TaskHubListProps) {
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

  useEffect(() => {
    setCommittees(data.committees);
  }, [data.committees]);

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

  function renderTaskList(
    committee: TaskHubCommitteeGroup,
    tasks: TaskHubTaskItem[],
  ) {
    const key = committeeKey(committee);

    return (
      <ul className="divide-y divide-cos-border">
        {tasks.map((task, taskIndex) => {
          const status = resolveTaskStatus(task.id, task.status);
          const isPending = pendingTaskIds.has(task.id);

          return (
            <li key={task.id}>
              <TaskHubTaskRow
                task={task}
                status={status}
                isPending={isPending}
                disabled={pending}
                draggable
                showGrip
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
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      {committees.map((group) => {
        const key = committeeKey(group);
        const collapsed = collapsedCommittees.has(key);
        const openCount = group.totalCount - group.doneCount;
        const secondaryGroups = groupTasksBySecondary(
          group.tasks,
          secondaryGroupMode,
          group.chairName,
        );

        return (
          <Card key={key} padding="none" className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-cos-border bg-cos-bg px-4 py-3">
              <button
                type="button"
                onClick={() => toggleCommitteeCollapsed(key)}
                className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-cos-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-cos-muted" />
                )}
                <span className="truncate font-display text-base text-cos-text">
                  {group.committeeName}
                </span>
                {group.chairName && (
                  <span className="truncate text-xs text-cos-muted">
                    · {group.chairName}
                  </span>
                )}
                <span className="text-xs text-cos-muted tabular-nums">
                  {group.doneCount}/{group.totalCount} done
                </span>
                {openCount > 0 && (
                  <Badge variant="warning">{openCount} open</Badge>
                )}
              </button>
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
                    "ring-1 ring-inset ring-cos-dark/30",
                )}
              >
                {secondaryGroupMode === "none" ? (
                  renderTaskList(group, group.tasks)
                ) : (
                  secondaryGroups.map((secondary) => {
                    const secondaryKey = `${key}:${secondary.key}`;
                    const secondaryCollapsed = collapsedSecondary.has(secondaryKey);

                    return (
                      <div
                        key={secondaryKey}
                        className="border-b border-cos-border last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSecondaryCollapsed(secondaryKey)}
                          className="flex w-full items-center gap-2 bg-cos-bg/40 px-4 py-2 text-left"
                          aria-expanded={!secondaryCollapsed}
                        >
                          {secondaryCollapsed ? (
                            <ChevronRight className="h-3.5 w-3.5 text-cos-muted" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-cos-muted" />
                          )}
                          <span className="text-xs font-medium tracking-wide text-cos-muted uppercase">
                            {secondary.label}
                          </span>
                          <span className="text-xs text-cos-muted tabular-nums">
                            ({secondary.tasks.length})
                          </span>
                        </button>
                        {!secondaryCollapsed &&
                          renderTaskList(group, secondary.tasks)}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// Keep order map export for tests if needed
export { buildCommitteeOrderMap };
