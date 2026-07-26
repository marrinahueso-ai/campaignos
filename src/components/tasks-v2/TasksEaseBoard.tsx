"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import {
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { tasksByBoardColumn } from "@/lib/task-hub/grouping";
import {
  FOCUS_BOARD_COLUMNS,
  FOCUS_BOARD_LABELS,
  FOCUS_IN_PROGRESS_WIP_LIMIT,
  focusColumnDropPatch,
  groupTasksByFocusColumn,
  type FocusBoardColumn,
} from "@/lib/tasks-v2/kanban-focus-board";
import {
  getColumnColorOverride,
  loadTasksEaseColors,
  resolveColumnColor,
  saveColumnColor,
} from "@/lib/tasks-v2/tasks-ease-colors";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

export type TasksEaseBoardMode = "status" | "focus";

interface StatusColumnMeta {
  key: EventPlaybookTaskStatus;
  label: string;
  defaultColor: string;
}

const STATUS_COLUMNS: StatusColumnMeta[] = [
  { key: "todo", label: "To do", defaultColor: "#a65a3a" },
  { key: "in_progress", label: "In progress", defaultColor: "#c4922e" },
  { key: "blocked", label: "Deferred", defaultColor: "#7a7166" },
  { key: "done", label: "Done", defaultColor: "#2a7a86" },
];

const FOCUS_COLUMN_DEFAULT_COLOR: Record<FocusBoardColumn, string> = {
  todo: "#a65a3a",
  this_week: "#c4922e",
  in_progress: "#6b8171",
  done: "#2a7a86",
};

interface TasksEaseBoardProps {
  mode: TasksEaseBoardMode;
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
  eventColors: Record<string, string>;
  onOpenTask: (task: TaskHubTaskItem) => void;
}

function cardDueLabel(task: TaskHubTaskItem, today: string): {
  label: string;
  overdue: boolean;
} {
  if (task.status === "done") {
    return { label: "Done", overdue: false };
  }
  const due = task.monday?.mondayDueDate ?? task.dueDate;
  if (!due) {
    return { label: "\u2014", overdue: false };
  }
  if (due < today) {
    return { label: "Overdue", overdue: true };
  }
  return {
    label: formatLocalDate(due, { month: "short", day: "numeric" }),
    overdue: false,
  };
}

export function TasksEaseBoard({
  mode,
  eventGroups,
  canEdit,
  eventColors,
  onOpenTask,
}: TasksEaseBoardProps) {
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
  const [columnColorTick, setColumnColorTick] = useState(0);

  useEffect(() => {
    loadTasksEaseColors();
    setColumnColorTick((tick) => tick + 1);
  }, []);

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
        current.map((entry) => (entry.id === task.id ? { ...entry, status } : entry)),
      );
    });
  }

  function applyFocusDrop(task: TaskHubTaskItem, column: FocusBoardColumn) {
    if (pendingTaskIds.has(task.id)) return;

    const patch = focusColumnDropPatch(column);
    const nextStatus = patch.status;
    const nextDueDate = patch.dueDate !== undefined ? patch.dueDate : task.dueDate;

    if (
      resolveStatus(task) === nextStatus &&
      (task.dueDate ?? null) === (nextDueDate ?? null)
    ) {
      return;
    }

    setTaskStatuses((current) => ({ ...current, [task.id]: nextStatus }));
    setTasks((current) =>
      current.map((entry) =>
        entry.id === task.id
          ? { ...entry, status: nextStatus, dueDate: nextDueDate ?? null }
          : entry,
      ),
    );
    setPending(task.id, true);

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
      setPending(task.id, false);
      if (!result.success) {
        setTasks(sourceTasks);
        setTaskStatuses({});
      }
    });
  }

  function handleColumnColorChange(key: string, color: string | null) {
    saveColumnColor(key, color);
    setColumnColorTick((tick) => tick + 1);
  }

  function handleDrop(
    event: React.DragEvent,
    onMatch: (task: TaskHubTaskItem) => void,
  ) {
    event.preventDefault();
    const payload = readTaskHubDragPayload(event);
    if (!payload) return;
    const task = tasks.find((entry) => entry.id === payload.taskId);
    if (!task || !canEdit) {
      setDragOverColumn(null);
      return;
    }
    onMatch(task);
    setDragOverColumn(null);
  }

  const today = getTodayDateString();

  function renderCard(task: TaskHubTaskItem) {
    const isPending = pendingTaskIds.has(task.id);
    const eventColor = eventColorLookup.get(task.eventId) ?? "#2f4a3c";
    const due = cardDueLabel({ ...task, status: resolveStatus(task) }, today);

    return (
      <div
        key={task.id}
        draggable={canEdit && !isPending}
        onDragStart={(event) => {
          if (!canEdit) return;
          setTaskHubDragData(event, {
            taskId: task.id,
            committeeKey: task.eventId,
            sourceStatus: resolveStatus(task),
          });
        }}
        onClick={() => onOpenTask(task)}
        className={cn(
          "mb-2 cursor-pointer rounded-2xl bg-cos-card p-3 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition hover:-translate-y-0.5",
          isPending && "opacity-60",
        )}
        style={{ borderLeft: `3px solid ${eventColor}` }}
      >
        <strong className="block truncate text-[13px] font-semibold text-cos-text">
          {task.title}
        </strong>
        <span className="mt-1 block truncate text-[11px] font-semibold text-cos-muted">
          {task.event.eventTitle}
        </span>
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-bold text-cos-muted">
          <span className="truncate">{task.assigneeName ?? "Unassigned"}</span>
          <span className={cn(due.overdue && "text-[#a65a3a]")}>{due.label}</span>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
        <strong className="mb-2 block font-display text-[22px] font-semibold text-cos-text">
          No tasks on the board
        </strong>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-cos-muted">
          Tasks from your accessible events will appear here as cards.
        </p>
      </div>
    );
  }

  if (mode === "status") {
    const resolved = tasks.map((task) => ({ ...task, status: resolveStatus(task) }));
    const columns = tasksByBoardColumn(resolved);

    return (
      <div className="space-y-3">
        <div
          key={columnColorTick}
          className="grid gap-3 overflow-x-auto pb-1"
          style={{ gridTemplateColumns: "repeat(4, minmax(200px, 1fr))" }}
        >
          {STATUS_COLUMNS.map((column) => {
            const columnKey = `status:${column.key}`;
            const columnColor = resolveColumnColor(columnKey, column.defaultColor);
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
                  setDragOverColumn((current) => (current === columnKey ? null : current))
                }
                onDrop={(event) =>
                  handleDrop(event, (task) => applyStatus(task, column.key))
                }
                className={cn(
                  "min-h-[18rem] rounded-[18px] border border-cos-border p-3",
                  dragOverColumn === columnKey &&
                    "ring-2 ring-cos-brand-sage ring-offset-2 ring-offset-cos-bg",
                )}
                style={{
                  borderTop: `3px solid ${columnColor}`,
                  backgroundColor: `color-mix(in srgb, ${columnColor} 8%, rgba(255,252,247,0.7))`,
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <DashboardWidgetColorPicker
                      label={column.label}
                      value={getColumnColorOverride(columnKey)}
                      swatchColor={columnColor}
                      variant="dot"
                      onChange={(color) => handleColumnColorChange(columnKey, color)}
                    />
                    <h3 className="truncate font-display text-[15px] font-semibold text-cos-text">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-xs font-extrabold text-cos-muted">
                    {columnTasks.length}
                  </span>
                </div>
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-8 text-center text-xs text-cos-muted">
                    {canEdit ? "Drop tasks here" : "No tasks"}
                  </p>
                ) : (
                  columnTasks.map((task) => renderCard(task))
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-cos-muted">
          Drag cards between columns · same tasks as the event Tasks tab. Dot = column
          color; card stripe = event color.
        </p>
      </div>
    );
  }

  const focusColumns = groupTasksByFocusColumn(tasks, taskStatuses);

  return (
    <div className="space-y-3">
      <div
        key={columnColorTick}
        className="grid gap-3 overflow-x-auto pb-1"
        style={{ gridTemplateColumns: "repeat(4, minmax(200px, 1fr))" }}
      >
        {FOCUS_BOARD_COLUMNS.map((column) => {
          const columnKey = `focus:${column}`;
          const columnColor = resolveColumnColor(
            columnKey,
            FOCUS_COLUMN_DEFAULT_COLOR[column],
          );
          const columnTasks = focusColumns[column];
          const countLabel =
            column === "in_progress"
              ? `${columnTasks.length} / ${FOCUS_IN_PROGRESS_WIP_LIMIT}`
              : String(columnTasks.length);

          return (
            <div
              key={column}
              onDragOver={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumn(columnKey);
              }}
              onDragLeave={() =>
                setDragOverColumn((current) => (current === columnKey ? null : current))
              }
              onDrop={(event) =>
                handleDrop(event, (task) => applyFocusDrop(task, column))
              }
              className={cn(
                "min-h-[18rem] rounded-[18px] border border-cos-border p-3",
                dragOverColumn === columnKey &&
                  "ring-2 ring-cos-brand-sage ring-offset-2 ring-offset-cos-bg",
              )}
              style={{
                borderTop: `3px solid ${columnColor}`,
                backgroundColor: `color-mix(in srgb, ${columnColor} 8%, rgba(255,252,247,0.7))`,
              }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <DashboardWidgetColorPicker
                    label={FOCUS_BOARD_LABELS[column]}
                    value={getColumnColorOverride(columnKey)}
                    swatchColor={columnColor}
                    variant="dot"
                    onChange={(color) => handleColumnColorChange(columnKey, color)}
                  />
                  <h3 className="truncate font-display text-[15px] font-semibold text-cos-text">
                    {FOCUS_BOARD_LABELS[column]}
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-cos-muted">
                  {countLabel}
                </span>
              </div>
              {columnTasks.length === 0 ? (
                <p className="px-1 py-8 text-center text-xs text-cos-muted">
                  {canEdit ? "Drop tasks here" : "No tasks"}
                </p>
              ) : (
                columnTasks.map((task) => renderCard(task))
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-cos-muted" aria-live="polite">
        {pending
          ? "Saving…"
          : "Focus board sorts by urgency, not raw status — still event-linked underneath."}
      </p>
    </div>
  );
}
