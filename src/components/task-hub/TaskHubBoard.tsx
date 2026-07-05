"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import { TaskHubTaskRow } from "@/components/task-hub/TaskHubTaskRow";
import { updateTaskHubTaskStatusAction } from "@/lib/task-hub/actions";
import { flattenCommitteeTasks, tasksByBoardColumn } from "@/lib/task-hub/grouping";
import {
  BOARD_COLUMN_STATUSES,
  nextTaskStatus,
} from "@/lib/event-playbooks/task-status";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubPageData, TaskHubTaskItem } from "@/types/task-hub";
import { LayoutGrid } from "lucide-react";

interface TaskHubBoardProps {
  data: TaskHubPageData;
}

const COLUMN_META: Record<
  (typeof BOARD_COLUMN_STATUSES)[number],
  { label: string; description: string }
> = {
  todo: { label: "To do", description: "Not started yet" },
  in_progress: { label: "In progress", description: "Active work" },
  blocked: { label: "Blocked", description: "Waiting on something" },
};

export function TaskHubBoard({ data }: TaskHubBoardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tasks, setTasks] = useState<TaskHubTaskItem[]>(() =>
    flattenCommitteeTasks(data.committees),
  );
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dragOverColumn, setDragOverColumn] = useState<EventPlaybookTaskStatus | null>(
    null,
  );
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    setTasks(flattenCommitteeTasks(data.committees));
  }, [data.committees]);

  const committeeByTaskId = useMemo(() => {
    const map = new Map<string, string>();
    for (const committee of data.committees) {
      for (const task of committee.tasks) {
        map.set(task.id, committee.committeeName);
      }
    }
    return map;
  }, [data.committees]);

  const columns = useMemo(() => {
    const resolved = tasks.map((task) => ({
      ...task,
      status: taskStatuses[task.id] ?? task.status,
    }));
    return tasksByBoardColumn(resolved);
  }, [tasks, taskStatuses]);

  function resolveStatus(task: TaskHubTaskItem): EventPlaybookTaskStatus {
    return taskStatuses[task.id] ?? task.status;
  }

  function handleToggleStatus(task: TaskHubTaskItem) {
    const current = resolveStatus(task);
    if (pendingTaskIds.has(task.id)) {
      return;
    }

    const status = nextTaskStatus(current);
    setTaskStatuses((currentMap) => ({ ...currentMap, [task.id]: status }));
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
        setTaskStatuses((currentMap) => {
          const next = { ...currentMap };
          delete next[task.id];
          return next;
        });
        return;
      }

      setTasks((current) =>
        current.map((entry) =>
          entry.id === task.id ? { ...entry, status } : entry,
        ),
      );
      router.refresh();
    });
  }

  function handleColumnDrop(
    targetStatus: EventPlaybookTaskStatus,
    event: React.DragEvent,
  ) {
    event.preventDefault();
    const payload = readTaskHubDragPayload(event);
    if (!payload) {
      return;
    }

    const task = tasks.find((entry) => entry.id === payload.taskId);
    if (!task) {
      return;
    }

    const currentStatus = resolveStatus(task);
    if (currentStatus === targetStatus) {
      setDragOverColumn(null);
      return;
    }

    setTaskStatuses((currentMap) => ({
      ...currentMap,
      [task.id]: targetStatus,
    }));
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        targetStatus,
        task.title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });

      if (!result.success) {
        setTaskStatuses((currentMap) => {
          const next = { ...currentMap };
          delete next[task.id];
          return next;
        });
        return;
      }

      setTasks((current) =>
        current.map((entry) =>
          entry.id === task.id ? { ...entry, status: targetStatus } : entry,
        ),
      );
      router.refresh();
    });

    setDragOverColumn(null);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No tasks on the board"
        description="Playbook tasks from active campaigns will appear here."
        className="cos-card py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {BOARD_COLUMN_STATUSES.map((columnStatus) => {
          const meta = COLUMN_META[columnStatus];
          const columnTasks = columns[columnStatus];

          return (
            <Card
              key={columnStatus}
              padding="none"
              className={cn(
                "flex min-h-[20rem] flex-col overflow-hidden",
                dragOverColumn === columnStatus && "ring-2 ring-cos-dark",
              )}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumn(columnStatus);
              }}
              onDragLeave={() => {
                if (dragOverColumn === columnStatus) {
                  setDragOverColumn(null);
                }
              }}
              onDrop={(event) => handleColumnDrop(columnStatus, event)}
            >
              <div className="border-b border-cos-border bg-cos-bg px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-cos-text">
                      {meta.label}
                    </h3>
                    <p className="text-xs text-cos-muted">{meta.description}</p>
                  </div>
                  <Badge variant="default">{columnTasks.length}</Badge>
                </div>
              </div>

              <ul className="flex-1 divide-y divide-cos-border overflow-y-auto">
                {columnTasks.map((task) => {
                  const status = resolveStatus(task);
                  const isPending = pendingTaskIds.has(task.id);

                  return (
                    <li
                      key={task.id}
                      draggable
                      onDragStart={(event) => {
                        setTaskHubDragData(event, {
                          taskId: task.id,
                          committeeKey: committeeByTaskId.get(task.id) ?? "",
                          sourceStatus: status,
                        });
                      }}
                    >
                      <TaskHubTaskRow
                        task={task}
                        status={status}
                        committeeName={committeeByTaskId.get(task.id)}
                        isPending={isPending}
                        disabled={pending}
                        compact
                        onToggleStatus={() => handleToggleStatus(task)}
                      />
                    </li>
                  );
                })}
                {columnTasks.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-cos-muted">
                    Drop tasks here
                  </li>
                )}
              </ul>
            </Card>
          );
        })}
      </div>

      {columns.done.length > 0 && (
        <Card padding="none" className="overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDone((value) => !value)}
            className="flex w-full items-center justify-between border-b border-cos-border bg-cos-bg px-4 py-3 text-left"
          >
            <span className="text-sm font-medium text-cos-text">
              Done ({columns.done.length})
            </span>
            <span className="text-xs text-cos-muted">
              {showDone ? "Hide" : "Show"}
            </span>
          </button>
          {showDone && (
            <ul className="divide-y divide-cos-border">
              {columns.done.map((task) => (
                <li key={task.id}>
                  <TaskHubTaskRow
                    task={task}
                    status="done"
                    committeeName={committeeByTaskId.get(task.id)}
                    compact
                    onToggleStatus={() => handleToggleStatus(task)}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
