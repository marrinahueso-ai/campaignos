"use client";

import { memo, useEffect, useMemo, useState, useTransition } from "react";
import { Calendar, Check, MoreHorizontal, Paperclip, Plus } from "lucide-react";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import { TasksV2OwnerAvatar } from "@/components/tasks-v2/TasksV2OwnerAvatar";
import { updateTaskHubTaskStatusAction } from "@/lib/task-hub/actions";
import { tasksByBoardColumn } from "@/lib/task-hub/grouping";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

interface StatusColumnMeta {
  key: EventPlaybookTaskStatus;
  label: string;
  /** Show + to open Add task with this Board status. */
  canQuickAdd: boolean;
  accent?: "amber";
}

const STATUS_COLUMNS: StatusColumnMeta[] = [
  { key: "todo", label: "To Do", canQuickAdd: true },
  { key: "in_progress", label: "In Progress", canQuickAdd: true },
  { key: "blocked", label: "Needs Review", canQuickAdd: false, accent: "amber" },
  { key: "done", label: "Done", canQuickAdd: false },
];

interface TasksEaseBoardProps {
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
  eventColors: Record<string, string>;
  viewerUserId?: string | null;
  onOpenTask: (task: TaskHubTaskItem) => void;
  /** Open the Pilot Add task modal, optionally preselecting Board status. */
  onAddTask?: (status: EventPlaybookTaskStatus) => void;
}

function cardDueLabel(task: TaskHubTaskItem, today: string): {
  label: string;
  overdue: boolean;
  completed?: string;
} {
  if (task.status === "done") {
    const due = task.monday?.mondayDueDate ?? task.dueDate;
    return {
      label: due
        ? `Completed ${formatLocalDate(due, { month: "short", day: "numeric" })}`
        : "Completed",
      overdue: false,
      completed: due
        ? formatLocalDate(due, { month: "short", day: "numeric" })
        : undefined,
    };
  }
  const due = task.monday?.mondayDueDate ?? task.dueDate;
  if (!due) {
    return { label: "—", overdue: false };
  }
  if (due < today) {
    return { label: "Overdue", overdue: true };
  }
  return {
    label: formatLocalDate(due, { month: "short", day: "numeric" }),
    overdue: false,
  };
}

export const TasksEaseBoard = memo(function TasksEaseBoard({
  eventGroups,
  canEdit,
  eventColors,
  viewerUserId = null,
  onOpenTask,
  onAddTask,
}: TasksEaseBoardProps) {
  const [, startTransition] = useTransition();
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

  useEffect(() => {
    setTasks(sourceTasks);
    setTaskStatuses((current) => {
      if (Object.keys(current).length === 0) return current;
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

  const eventColorLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of eventGroups) {
      map.set(group.eventId, eventColors[group.eventId] ?? group.accentColor);
    }
    return map;
  }, [eventGroups, eventColors]);

  function resolveStatus(task: TaskHubTaskItem): EventPlaybookTaskStatus {
    return taskStatuses[task.id] ?? task.status;
  }

  function setPending(taskId: string, isPending: boolean) {
    setPendingTaskIds((current) => {
      const next = new Set(current);
      if (isPending) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  function applyStatus(task: TaskHubTaskItem, status: EventPlaybookTaskStatus) {
    if (pendingTaskIds.has(task.id) || resolveStatus(task) === status) return;

    setTaskStatuses((current) => ({ ...current, [task.id]: status }));
    setPending(task.id, true);

    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        status,
        task.title,
      );
      setPending(task.id, false);
      if (!result.success) {
        setTaskStatuses((current) => {
          const next = { ...current };
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
    });
  }

  function handleDrop(
    event: React.DragEvent,
    status: EventPlaybookTaskStatus,
  ) {
    event.preventDefault();
    const payload = readTaskHubDragPayload(event);
    if (!payload) return;
    const task = tasks.find((entry) => entry.id === payload.taskId);
    if (!task || !canEdit) {
      setDragOverColumn(null);
      return;
    }
    applyStatus(task, status);
    setDragOverColumn(null);
  }

  const today = getTodayDateString();
  const resolved = tasks.map((task) => ({
    ...task,
    status: resolveStatus(task),
  }));
  const columns = tasksByBoardColumn(resolved);

  function renderCard(task: TaskHubTaskItem, columnAccent?: "amber") {
    const isPending = pendingTaskIds.has(task.id);
    const status = resolveStatus(task);
    const isDone = status === "done";
    const eventColor = eventColorLookup.get(task.eventId) ?? "#c4922e";
    const due = cardDueLabel({ ...task, status }, today);
    const needsYou =
      Boolean(viewerUserId) &&
      task.assigneeUserId === viewerUserId &&
      !isDone;
    const hasNotes = Boolean(task.hasNotes) || Boolean(task.notes?.trim());

    return (
      <div
        key={task.id}
        draggable={canEdit && !isPending}
        onDragStart={(event) => {
          if (!canEdit) return;
          setTaskHubDragData(event, {
            taskId: task.id,
            committeeKey: task.eventId,
            sourceStatus: status,
          });
        }}
        onDragEnd={() => setDragOverColumn(null)}
        onClick={() => onOpenTask(task)}
        className={cn(
          "cursor-grab rounded-2xl border border-[#e8e2d9] bg-white p-4 text-left transition hover:border-[#2f4a3c] hover:shadow-[0_4px_12px_rgba(47,74,60,0.05)] active:cursor-grabbing",
          isPending && "opacity-60",
          columnAccent === "amber" && "border-amber-100 bg-amber-50/20",
          isDone && "opacity-60",
        )}
        style={{ borderLeft: `3px solid ${eventColor}` }}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: eventColor }}
              aria-hidden
            />
            <span className="truncate text-[10px] font-bold tracking-tighter text-[#a8a29c] uppercase">
              {task.event.eventTitle}
            </span>
          </div>
          {needsYou ? (
            <span className="shrink-0 rounded bg-amber-100 px-2 py-0.5 text-[9px] font-bold tracking-tighter text-amber-700 uppercase">
              Needs you
            </span>
          ) : isDone ? (
            <Check className="h-3 w-3 shrink-0 text-[#2f4a3c]" aria-hidden />
          ) : (
            <button
              type="button"
              aria-label={`Open ${task.title}`}
              className="text-[#a8a29c] hover:text-[#2a2622]"
              onClick={(event) => {
                event.stopPropagation();
                onOpenTask(task);
              }}
            >
              <MoreHorizontal className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>

        <h4
          className={cn(
            "mb-4 text-sm font-bold text-[#2a2622]",
            isDone && "text-cos-muted mb-2 line-through",
          )}
        >
          {task.title}
        </h4>

        <div className="flex items-center justify-between gap-2">
          {isDone ? (
            <span className="text-[10px] text-[#a8a29c]">{due.label}</span>
          ) : hasNotes ? (
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#a8a29c]">
              <Paperclip className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">Has notes</span>
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center gap-2 text-[11px]",
                due.overdue
                  ? "font-bold text-[#a67b27]"
                  : "text-[#a8a29c]",
              )}
            >
              <Calendar className="h-3 w-3 shrink-0" aria-hidden />
              <span>{due.label}</span>
            </div>
          )}
          <span className={cn(isDone && "grayscale")}>
            <TasksV2OwnerAvatar
              name={task.assigneeName}
              initials={task.assigneeInitials}
            />
          </span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e8e2d9] bg-white/70 px-6 py-12 text-center">
        <strong
          className="mb-2 block text-[22px] font-semibold text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          No tasks on the board
        </strong>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[#5c5752]">
          When your team adds tasks to events, they show up here as cards.
        </p>
        {canEdit && onAddTask ? (
          <button
            type="button"
            onClick={() => onAddTask("todo")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#2f4a3c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#253a2f]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add task
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STATUS_COLUMNS.map((column) => {
        const columnKey = `status:${column.key}`;
        const columnTasks = columns[column.key];

        return (
          <div
            key={column.key}
            onDragOver={(event) => {
              if (!canEdit) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDragOverColumn(columnKey);
            }}
            onDragLeave={() =>
              setDragOverColumn((current) =>
                current === columnKey ? null : current,
              )
            }
            onDragEnd={() => setDragOverColumn(null)}
            onDrop={(event) => handleDrop(event, column.key)}
            className={cn(
              "flex w-[320px] shrink-0 flex-col gap-4",
              dragOverColumn === columnKey &&
                "rounded-2xl ring-2 ring-[#2f4a3c]/30 ring-offset-2 ring-offset-[#f6f2eb]",
            )}
          >
            <div
              className={cn(
                "mb-2 flex items-center justify-between px-2",
                column.accent === "amber" && "border-b-2 border-amber-100 pb-2",
              )}
            >
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-[#2a2622]">
                  {column.label}
                </h3>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold",
                    column.accent === "amber"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-[#e8e2d9]/40 text-[#5c5752]",
                  )}
                >
                  {columnTasks.length}
                </span>
              </div>
              {column.canQuickAdd && canEdit && onAddTask ? (
                <button
                  type="button"
                  aria-label={`Add task to ${column.label}`}
                  onClick={() => onAddTask(column.key)}
                  className="text-[#a8a29c] transition hover:text-[#2a2622]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>

            <div
              className={cn(
                "flex min-h-[12rem] flex-col gap-3",
                column.key === "done" && "opacity-60",
              )}
            >
              {columnTasks.length === 0 ? (
                <p className="px-2 py-8 text-center text-xs text-[#a8a29c]">
                  {canEdit ? "Drop tasks here" : "No tasks"}
                </p>
              ) : (
                columnTasks.map((task) => renderCard(task, column.accent))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
