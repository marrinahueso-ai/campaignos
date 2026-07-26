"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import {
  readTaskHubDragPayload,
  setTaskHubDragData,
} from "@/components/task-hub/task-hub-dnd";
import { flattenEventGroups } from "@/lib/tasks-v2/group-by-event";
import {
  loadTasksEaseCustomBoard,
  resolveCustomColumnId,
  saveTasksEaseCustomBoard,
  type TasksEaseCustomColumn,
} from "@/lib/tasks-v2/tasks-ease-custom-board";
import {
  getColumnColorOverride,
  loadTasksEaseColors,
  resolveColumnColor,
  saveColumnColor,
} from "@/lib/tasks-v2/tasks-ease-colors";
import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

const DEFAULT_COLUMN_COLORS = ["#a65a3a", "#2f4a3c", "#c4922e", "#2a7a86", "#6b8171", "#8b6f4d"];

function columnDefaultColor(index: number): string {
  return DEFAULT_COLUMN_COLORS[index % DEFAULT_COLUMN_COLORS.length] ?? "#2f4a3c";
}

function newColumnId(): string {
  return `col-${Math.random().toString(36).slice(2, 9)}`;
}

interface TasksEaseCustomBoardProps {
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
  eventColors: Record<string, string>;
  onOpenTask: (task: TaskHubTaskItem) => void;
}

export function TasksEaseCustomBoard({
  eventGroups,
  canEdit,
  eventColors,
  onOpenTask,
}: TasksEaseCustomBoardProps) {
  const [columns, setColumns] = useState<TasksEaseCustomColumn[]>([]);
  const [taskColumnMap, setTaskColumnMap] = useState<Record<string, string>>({});
  const [boardOpen, setBoardOpen] = useState(false);
  const [colorTick, setColorTick] = useState(0);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    const state = loadTasksEaseCustomBoard();
    setColumns(state.columns);
    setTaskColumnMap(state.taskColumnMap);
    loadTasksEaseColors();
    setColorTick((tick) => tick + 1);
  }, []);

  const tasks = useMemo(() => flattenEventGroups(eventGroups), [eventGroups]);

  const eventColorLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of eventGroups) {
      map.set(group.eventId, eventColors[group.eventId] ?? group.accentColor);
    }
    return map;
  }, [eventGroups, eventColors]);

  function persist(nextColumns: TasksEaseCustomColumn[], nextMap: Record<string, string>) {
    saveTasksEaseCustomBoard({ columns: nextColumns, taskColumnMap: nextMap });
  }

  function updateColumnName(id: string, name: string) {
    setColumns((current) => {
      const next = current.map((column) => (column.id === id ? { ...column, name } : column));
      persist(next, taskColumnMap);
      return next;
    });
  }

  function removeColumn(id: string) {
    setColumns((current) => {
      if (current.length <= 1) return current;
      const next = current.filter((column) => column.id !== id);
      const fallbackId = next[0]?.id ?? "";
      const nextMap = Object.fromEntries(
        Object.entries(taskColumnMap).map(([taskId, columnId]) => [
          taskId,
          columnId === id ? fallbackId : columnId,
        ]),
      );
      setTaskColumnMap(nextMap);
      persist(next, nextMap);
      return next;
    });
  }

  function addColumn() {
    setColumns((current) => {
      const next = [...current, { id: newColumnId(), name: "New column" }];
      persist(next, taskColumnMap);
      return next;
    });
  }

  function moveTaskToColumn(taskId: string, columnId: string) {
    setTaskColumnMap((current) => {
      const next = { ...current, [taskId]: columnId };
      persist(columns, next);
      return next;
    });
  }

  function handleColumnColorChange(columnId: string, color: string | null) {
    saveColumnColor(`custom:${columnId}`, color);
    setColorTick((tick) => tick + 1);
  }

  const columnsWithTasks = useMemo(() => {
    const state = { columns, taskColumnMap };
    const buckets = new Map<string, TaskHubTaskItem[]>();
    for (const column of columns) buckets.set(column.id, []);
    for (const task of tasks) {
      const columnId = resolveCustomColumnId(task.id, state);
      const bucket = buckets.get(columnId);
      if (bucket) bucket.push(task);
    }
    return columns.map((column) => ({
      column,
      tasks: buckets.get(column.id) ?? [],
    }));
  }, [columns, taskColumnMap, tasks]);

  const today = getTodayDateString();

  function renderCard(task: TaskHubTaskItem) {
    const eventColor = eventColorLookup.get(task.eventId) ?? "#2f4a3c";
    const due = task.monday?.mondayDueDate ?? task.dueDate;
    const dueLabel =
      task.status === "done"
        ? "Done"
        : due
          ? due < today
            ? "Overdue"
            : formatLocalDate(due, { month: "short", day: "numeric" })
          : "\u2014";

    return (
      <div
        key={task.id}
        draggable={canEdit}
        onDragStart={(event) => {
          if (!canEdit) return;
          setTaskHubDragData(event, {
            taskId: task.id,
            committeeKey: task.eventId,
            sourceStatus: task.status,
          });
        }}
        onClick={() => onOpenTask(task)}
        className="mb-2 cursor-pointer rounded-2xl bg-cos-card p-3 text-left shadow-[0_8px_28px_rgba(28,36,48,0.06)] transition hover:-translate-y-0.5"
        style={{ borderLeft: `3px solid ${eventColor}` }}
      >
        <strong className="block truncate text-[13px] font-semibold text-cos-text">
          {task.title}
        </strong>
        <span className="mt-1 block truncate text-[11px] font-semibold text-cos-muted">
          {task.event.eventTitle}
          {" · "}
          {dueLabel}
        </span>
      </div>
    );
  }

  if (!boardOpen) {
    return (
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
        <div className="rounded-[22px] border border-cos-border bg-cos-card p-[22px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
          <h3 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
            Custom board
          </h3>
          <p className="mt-1.5 max-w-[46ch] text-[13px] leading-relaxed text-cos-muted">
            Name columns for how your PTO actually works — then drop the same event
            tasks into them. Boards are per person; Team scope still shows everyone’s
            cards.
          </p>
          <div className="mt-3.5 flex flex-col gap-2">
            {columns.map((column) => (
              <label
                key={column.id}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl bg-[rgba(255,252,247,0.7)] px-3 py-2.5"
              >
                <input
                  value={column.name}
                  disabled={!canEdit}
                  onChange={(event) => updateColumnName(column.id, event.target.value)}
                  className="border-0 bg-transparent text-[13px] font-bold text-cos-text outline-none disabled:opacity-70"
                />
                <button
                  type="button"
                  disabled={!canEdit || columns.length <= 1}
                  onClick={() => removeColumn(column.id)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-bold text-cos-muted hover:text-cos-text disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Remove
                </button>
              </label>
            ))}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canEdit}
              onClick={addColumn}
              className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add column
            </button>
            <button
              type="button"
              onClick={() => setBoardOpen(true)}
              className="inline-flex items-center rounded-full bg-cos-text px-4 py-2.5 text-[13px] font-bold text-cos-card transition hover:-translate-y-px"
            >
              Open board
            </button>
          </div>
          <p className="mt-3.5 text-xs text-cos-muted">
            Custom boards don’t invent new tasks — they rearrange the event task list
            you already have.
          </p>
        </div>

        <div
          className="rounded-[22px] border border-cos-border p-[18px] shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
          style={{
            background:
              "radial-gradient(ellipse 50% 80% at 0% 50%, rgba(47,74,60,0.1), transparent 60%), radial-gradient(ellipse 40% 70% at 100% 30%, rgba(196,146,46,0.12), transparent 55%), #fffcf7",
          }}
        >
          <p className="mb-2 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
            Preview
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {columnsWithTasks.slice(0, 2).map(({ column, tasks: columnTasks }, index) => {
              const columnColor = resolveColumnColor(
                `custom:${column.id}`,
                columnDefaultColor(index),
              );
              return (
                <div
                  key={column.id}
                  className="min-h-[9rem] rounded-[16px] border border-cos-border p-2.5"
                  style={{
                    borderTop: `3px solid ${columnColor}`,
                    backgroundColor: `color-mix(in srgb, ${columnColor} 8%, rgba(255,252,247,0.7))`,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-1.5">
                    <span className="truncate font-display text-[13px] font-semibold text-cos-text">
                      {column.name}
                    </span>
                    <span className="text-[11px] font-extrabold text-cos-muted">
                      {columnTasks.length}
                    </span>
                  </div>
                  {columnTasks.slice(0, 1).map((task) => renderCard(task))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-cos-muted">
          Custom board — drag cards between your columns.
        </p>
        <button
          type="button"
          onClick={() => setBoardOpen(false)}
          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-3.5 py-2 text-xs font-bold text-cos-text transition hover:-translate-y-px"
        >
          Edit columns
        </button>
      </div>
      <div
        key={colorTick}
        className="grid gap-3 overflow-x-auto pb-1"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(200px, 1fr))`,
        }}
      >
        {columnsWithTasks.map(({ column, tasks: columnTasks }, index) => {
          const columnKey = `custom:${column.id}`;
          const columnColor = resolveColumnColor(columnKey, columnDefaultColor(index));

          return (
            <div
              key={column.id}
              onDragOver={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDragOverColumn(column.id);
              }}
              onDragLeave={() =>
                setDragOverColumn((current) => (current === column.id ? null : current))
              }
              onDrop={(event) => {
                event.preventDefault();
                const payload = readTaskHubDragPayload(event);
                setDragOverColumn(null);
                if (!payload || !canEdit) return;
                moveTaskToColumn(payload.taskId, column.id);
              }}
              className={cn(
                "min-h-[18rem] rounded-[18px] border border-cos-border p-3",
                dragOverColumn === column.id &&
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
                    label={column.name}
                    value={getColumnColorOverride(columnKey)}
                    swatchColor={columnColor}
                    variant="dot"
                    onChange={(color) => handleColumnColorChange(column.id, color)}
                  />
                  <h3 className="truncate font-display text-[15px] font-semibold text-cos-text">
                    {column.name}
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
      {!canEdit ? (
        <p className="flex items-center gap-1 text-xs text-cos-muted">
          <X className="h-3 w-3" aria-hidden />
          View only — you don’t have edit access on these events.
        </p>
      ) : null}
    </div>
  );
}
