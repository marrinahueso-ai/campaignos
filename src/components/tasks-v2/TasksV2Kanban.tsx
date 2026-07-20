"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import { TaskHubTaskRow } from "@/components/task-hub/TaskHubTaskRow";
import {
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { tasksByBoardColumn } from "@/lib/task-hub/grouping";
import {
  BOARD_COLUMN_STATUSES,
  nextTaskStatus,
  taskStatusLabel,
} from "@/lib/event-playbooks/task-status";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import {
  FOCUS_BOARD_COLUMNS,
  FOCUS_BOARD_LABELS,
  FOCUS_IN_PROGRESS_WIP_LIMIT,
  focusColumnDropPatch,
  groupTasksByFocusColumn,
  type FocusBoardColumn,
  type TasksV2KanbanBoardMode,
} from "@/lib/tasks-v2/kanban-focus-board";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

interface TasksV2KanbanProps {
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
}

const STATUS_COLUMN_META: Record<
  (typeof BOARD_COLUMN_STATUSES)[number],
  { label: string; headerClass: string; titleClass?: string }
> = {
  todo: {
    label: taskStatusLabel("todo"),
    headerClass: "border-t-[3px] border-t-[var(--cos-status-todo)] bg-[var(--cos-status-todo-bg)]",
    titleClass: "text-[var(--cos-status-todo-text)]",
  },
  in_progress: {
    label: taskStatusLabel("in_progress"),
    headerClass:
      "border-t-[3px] border-t-[var(--cos-status-progress)] bg-[var(--cos-status-progress-bg)]",
    titleClass: "text-[var(--cos-status-progress-text)]",
  },
  blocked: {
    label: taskStatusLabel("blocked"),
    headerClass:
      "border-t-[3px] border-t-[var(--cos-status-blocked)] bg-[var(--cos-status-blocked-bg)]",
    titleClass: "text-[var(--cos-status-blocked-text)]",
  },
};

const FOCUS_COLUMN_META: Record<
  FocusBoardColumn,
  { headerClass: string; titleClass: string; bodyClass: string }
> = {
  todo: {
    headerClass:
      "border-t-[3px] border-t-[var(--cos-status-todo)] bg-[var(--cos-status-todo-bg)]",
    titleClass: "text-[var(--cos-status-todo-text)]",
    bodyClass: "bg-[var(--cos-status-todo-bg)]/35",
  },
  this_week: {
    headerClass: "border-t-[3px] border-t-[var(--cos-accent)] bg-[var(--cos-warning)]",
    titleClass: "text-[var(--cos-warning-text)]",
    bodyClass: "bg-[var(--cos-warning)]/40",
  },
  in_progress: {
    headerClass:
      "border-t-[3px] border-t-[var(--cos-status-progress)] bg-[var(--cos-status-progress-bg)]",
    titleClass: "text-[var(--cos-status-progress-text)]",
    bodyClass: "bg-[var(--cos-status-progress-bg)]/45",
  },
  done: {
    headerClass:
      "border-t-[3px] border-t-[var(--cos-status-done)] bg-[var(--cos-status-done-bg)]",
    titleClass: "text-[var(--cos-status-done-text)]",
    bodyClass: "bg-[var(--cos-status-done-bg)]/40",
  },
};

export function TasksV2Kanban({ eventGroups, canEdit }: TasksV2KanbanProps) {
  const router = useRouter();
  const [boardMode, setBoardMode] = useState<TasksV2KanbanBoardMode>("status");
  const [pending, startTransition] = useTransition();
  const sourceTasks = useMemo(
    () => flattenEventGroups(eventGroups),
    [eventGroups],
  );
  const [tasks, setTasks] = useState<TaskHubTaskItem[]>(sourceTasks);
  const [taskStatuses, setTaskStatuses] = useState<
    Record<string, EventPlaybookTaskStatus>
  >({});
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    setTasks(sourceTasks);
    // Drop overrides once server data catches up so Done cards stay
    // after refresh without fighting local status maps.
    setTaskStatuses((current) => {
      if (Object.keys(current).length === 0) {
        return current;
      }
      const next: Record<string, EventPlaybookTaskStatus> = {};
      for (const [id, status] of Object.entries(current)) {
        const server = sourceTasks.find((task) => task.id === id);
        if (server && server.status !== status) {
          next[id] = status;
        }
      }
      return next;
    });
  }, [sourceTasks]);

  const statusColumns = useMemo(() => {
    const resolved = tasks.map((task) => ({
      ...task,
      status: taskStatuses[task.id] ?? task.status,
    }));
    return tasksByBoardColumn(resolved);
  }, [tasks, taskStatuses]);

  const focusColumns = useMemo(
    () => groupTasksByFocusColumn(tasks, taskStatuses),
    [tasks, taskStatuses],
  );

  function resolveStatus(task: TaskHubTaskItem): EventPlaybookTaskStatus {
    return taskStatuses[task.id] ?? task.status;
  }

  function applyStatus(
    task: TaskHubTaskItem,
    status: EventPlaybookTaskStatus,
  ) {
    if (pendingTaskIds.has(task.id) || resolveStatus(task) === status) {
      return;
    }

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

  function applyFocusDrop(task: TaskHubTaskItem, column: FocusBoardColumn) {
    if (pendingTaskIds.has(task.id)) {
      return;
    }

    const patch = focusColumnDropPatch(column);
    const nextStatus = patch.status;
    const nextDueDate =
      patch.dueDate !== undefined ? patch.dueDate : task.dueDate;

    if (
      resolveStatus(task) === nextStatus &&
      (task.dueDate ?? null) === (nextDueDate ?? null)
    ) {
      return;
    }

    setTaskStatuses((currentMap) => ({ ...currentMap, [task.id]: nextStatus }));
    setTasks((current) =>
      current.map((entry) =>
        entry.id === task.id
          ? { ...entry, status: nextStatus, dueDate: nextDueDate ?? null }
          : entry,
      ),
    );
    setPendingTaskIds((current) => new Set(current).add(task.id));

    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        task.eventId,
        task.id,
        {
          status: nextStatus,
          ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        },
        task.title,
      );

      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });

      if (!result.success) {
        setTasks(sourceTasks);
        setTaskStatuses({});
        return;
      }

      router.refresh();
    });
  }

  function handleStatusColumnDrop(
    targetStatus: EventPlaybookTaskStatus,
    event: React.DragEvent,
  ) {
    event.preventDefault();
    const payload = readTaskHubDragPayload(event);
    if (!payload) {
      return;
    }

    const task = tasks.find((entry) => entry.id === payload.taskId);
    if (!task || !canEdit) {
      setDragOverColumn(null);
      return;
    }

    applyStatus(task, targetStatus);
    setDragOverColumn(null);
  }

  function handleFocusColumnDrop(
    column: FocusBoardColumn,
    event: React.DragEvent,
  ) {
    event.preventDefault();
    const payload = readTaskHubDragPayload(event);
    if (!payload) {
      return;
    }

    const task = tasks.find((entry) => entry.id === payload.taskId);
    if (!task || !canEdit) {
      setDragOverColumn(null);
      return;
    }

    applyFocusDrop(task, column);
    setDragOverColumn(null);
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No tasks on the board"
        description="Tasks from your accessible events will appear here as cards."
        className="border border-cos-border bg-cos-card py-16"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="inline-flex rounded-lg border border-cos-border bg-cos-card p-0.5"
        role="group"
        aria-label="Board layout"
      >
        <button
          type="button"
          onClick={() => setBoardMode("status")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            boardMode === "status"
              ? "bg-cos-dark text-[#f6f2eb]"
              : "text-cos-muted hover:text-cos-text",
          )}
        >
          By status
        </button>
        <button
          type="button"
          onClick={() => setBoardMode("focus")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            boardMode === "focus"
              ? "bg-cos-dark text-[#f6f2eb]"
              : "text-cos-muted hover:text-cos-text",
          )}
        >
          Focus board
        </button>
      </div>

      {boardMode === "focus" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FOCUS_BOARD_COLUMNS.map((column) => {
            const columnTasks = focusColumns[column];
            const label = FOCUS_BOARD_LABELS[column];
            const meta = FOCUS_COLUMN_META[column];
            const countLabel =
              column === "in_progress"
                ? `${columnTasks.length} / ${FOCUS_IN_PROGRESS_WIP_LIMIT}`
                : String(columnTasks.length);
            const wipOver =
              column === "in_progress" &&
              columnTasks.length > FOCUS_IN_PROGRESS_WIP_LIMIT;

            return (
              <Card
                key={column}
                padding="none"
                className={cn(
                  "flex min-h-[22rem] flex-col overflow-hidden shadow-sm",
                  dragOverColumn === column &&
                    "ring-2 ring-cos-accent ring-offset-2 ring-offset-cos-bg",
                )}
                onDragOver={(event) => {
                  if (!canEdit) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverColumn(column);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === column) {
                    setDragOverColumn(null);
                  }
                }}
                onDrop={(event) => handleFocusColumnDrop(column, event)}
              >
                <div
                  className={cn(
                    "border-b border-cos-border px-4 py-3",
                    meta.headerClass,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className={cn("text-sm font-semibold", meta.titleClass)}
                    >
                      {label}
                    </h3>
                    <Badge
                      variant="default"
                      className={cn(
                        "tabular-nums",
                        wipOver && "bg-[var(--cos-error-bg)] text-[var(--cos-error-text)]",
                      )}
                    >
                      {countLabel}
                    </Badge>
                  </div>
                </div>

                <div
                  className={cn("flex-1 space-y-0 overflow-y-auto py-1", meta.bodyClass)}
                >
                  {columnTasks.map((task) => {
                    const status = resolveStatus(task);
                    const isPending = pendingTaskIds.has(task.id);

                    return (
                      <div
                        key={task.id}
                        draggable={canEdit && !isPending}
                        onDragStart={(event) => {
                          if (!canEdit) return;
                          setTaskHubDragData(event, {
                            taskId: task.id,
                            committeeKey: task.event.eventId,
                            sourceStatus: status,
                          });
                        }}
                      >
                        <TaskHubTaskRow
                          task={task}
                          status={status}
                          committeeName={task.event.eventTitle}
                          isPending={isPending}
                          disabled={pending}
                          canEdit={canEdit}
                          variant="board"
                          onToggleStatus={() =>
                            applyStatus(task, nextTaskStatus(status))
                          }
                          onStatusChange={(nextStatus) =>
                            applyStatus(task, nextStatus)
                          }
                        />
                      </div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <p className="px-4 py-10 text-center text-sm text-cos-muted">
                      {canEdit ? "Drop tasks here" : "No tasks"}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {BOARD_COLUMN_STATUSES.map((columnStatus) => {
              const meta = STATUS_COLUMN_META[columnStatus];
              const columnTasks = statusColumns[columnStatus];

              return (
                <Card
                  key={columnStatus}
                  padding="none"
                  className={cn(
                    "flex min-h-[22rem] flex-col overflow-hidden shadow-sm",
                    dragOverColumn === columnStatus &&
                      "ring-2 ring-cos-accent ring-offset-2 ring-offset-cos-bg",
                  )}
                  onDragOver={(event) => {
                    if (!canEdit) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDragOverColumn(columnStatus);
                  }}
                  onDragLeave={() => {
                    if (dragOverColumn === columnStatus) {
                      setDragOverColumn(null);
                    }
                  }}
                  onDrop={(event) => handleStatusColumnDrop(columnStatus, event)}
                >
                  <div
                    className={cn(
                      "border-b border-cos-border px-4 py-3",
                      meta.headerClass,
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={cn(
                          "text-sm font-semibold",
                          meta.titleClass ?? "text-cos-text",
                        )}
                      >
                        {meta.label}
                      </h3>
                      <Badge variant="default">{columnTasks.length}</Badge>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-cos-bg/30 py-1">
                    {columnTasks.map((task) => {
                      const status = resolveStatus(task);
                      const isPending = pendingTaskIds.has(task.id);

                      return (
                        <div
                          key={task.id}
                          draggable={canEdit && !isPending}
                          onDragStart={(event) => {
                            if (!canEdit) return;
                            setTaskHubDragData(event, {
                              taskId: task.id,
                              committeeKey: task.event.eventId,
                              sourceStatus: status,
                            });
                          }}
                        >
                          <TaskHubTaskRow
                            task={task}
                            status={status}
                            committeeName={task.event.eventTitle}
                            isPending={isPending}
                            disabled={pending}
                            canEdit={canEdit}
                            variant="board"
                            onToggleStatus={() =>
                              applyStatus(task, nextTaskStatus(status))
                            }
                            onStatusChange={(nextStatus) =>
                              applyStatus(task, nextStatus)
                            }
                          />
                        </div>
                      );
                    })}
                    {columnTasks.length === 0 && (
                      <p className="px-4 py-10 text-center text-sm text-cos-muted">
                        {canEdit ? "Drop tasks here" : "No tasks"}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {statusColumns.done.length > 0 && (
            <Card padding="none" className="overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDone((value) => !value)}
                className="flex w-full items-center justify-between border-t-[3px] border-t-[var(--cos-status-done)] border-b border-cos-border bg-[var(--cos-status-done-bg)] px-4 py-3 text-left transition-colors hover:opacity-90"
              >
                <span className="text-sm font-semibold text-[var(--cos-status-done-text)]">
                  {taskStatusLabel("done")} ({statusColumns.done.length})
                </span>
                <span className="text-xs text-cos-muted">
                  {showDone ? "Hide" : "Show"}
                </span>
              </button>
              {showDone && (
                <div className="grid gap-0 bg-cos-bg/30 sm:grid-cols-2 lg:grid-cols-3">
                  {statusColumns.done.map((task) => (
                    <TaskHubTaskRow
                      key={task.id}
                      task={task}
                      status="done"
                      committeeName={task.event.eventTitle}
                      canEdit={canEdit}
                      variant="board"
                      onToggleStatus={() =>
                        applyStatus(task, nextTaskStatus("done"))
                      }
                      onStatusChange={(nextStatus) =>
                        applyStatus(task, nextStatus)
                      }
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
