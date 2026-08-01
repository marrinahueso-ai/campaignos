"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronsUp,
  Check,
  Flag,
  Minus,
  MoreHorizontal,
  Paperclip,
  Pencil,
} from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { TasksV2AssigneeSelect } from "@/components/tasks-v2/TasksV2AssigneeSelect";
import { TasksV2StatusPill } from "@/components/tasks-v2/TasksV2StatusPill";
import {
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { deriveTaskPriority } from "@/lib/tasks-v2/derive-priority";
import {
  loadTasksEasePriorities,
  saveTaskPriority,
} from "@/lib/tasks-v2/tasks-ease-priorities";
import { tasksV2PriorityLabel } from "@/lib/tasks-v2/status-labels";
import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubOrgMember, TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup, TasksV2Priority } from "@/types/tasks-v2";

const PRIORITY_OPTIONS: TasksV2Priority[] = ["high", "medium", "low"];

const PRIORITY_SELECT_STYLE: Record<TasksV2Priority, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-[#a8a29c]",
};

interface TasksEaseListProps {
  eventGroups: TasksV2EventGroup[];
  canEdit: boolean;
  orgMembers: TaskHubOrgMember[];
  eventColors: Record<string, string>;
  onEventColorChange: (eventId: string, color: string | null) => void;
  onOpenTask: (task: TaskHubTaskItem) => void;
  emptyTitle: string;
  emptyBody: string;
  /** Current user — used for “Needs you” badge. */
  viewerUserId?: string | null;
}

type TaskOverride = Partial<
  Pick<
    TaskHubTaskItem,
    "status" | "dueDate" | "assigneeUserId" | "assigneeName" | "assigneeInitials"
  >
>;

type PrioritySort = "none" | "asc" | "desc";

const PRIORITY_RANK: Record<TasksV2Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function effectiveDue(task: TaskHubTaskItem): string | null {
  // Prefer playbook dueDate so list edits win over Monday sync display.
  return task.dueDate ?? task.monday?.mondayDueDate ?? null;
}

function formatDueCell(task: TaskHubTaskItem, today: string): {
  label: string;
  dateLabel: string;
  overdue: boolean;
} {
  if (task.status === "done") {
    const due = effectiveDue(task);
    const dateLabel = due
      ? formatLocalDate(due, { month: "short", day: "numeric" })
      : "—";
    return { label: dateLabel, dateLabel, overdue: false };
  }
  const due = effectiveDue(task);
  if (!due) return { label: "—", dateLabel: "—", overdue: false };
  const overdue = due < today;
  const isToday = due === today;
  const dateLabel = formatLocalDate(due, { month: "short", day: "numeric" });
  if (isToday) return { label: "Today", dateLabel: "Today", overdue: false };
  if (overdue) {
    return {
      label: `${dateLabel} (Overdue)`,
      dateLabel,
      overdue: true,
    };
  }
  return { label: dateLabel, dateLabel, overdue: false };
}

function PriorityIcon({ priority }: { priority: TasksV2Priority }) {
  if (priority === "high") {
    return <ChevronsUp className="h-3 w-3 shrink-0" aria-hidden />;
  }
  if (priority === "medium") {
    return <ArrowUp className="h-3 w-3 shrink-0" aria-hidden />;
  }
  return <Minus className="h-3 w-3 shrink-0" aria-hidden />;
}

export function TasksEaseList({
  eventGroups,
  canEdit,
  orgMembers,
  eventColors,
  onEventColorChange,
  onOpenTask,
  emptyTitle,
  emptyBody,
  viewerUserId = null,
}: TasksEaseListProps) {
  const [, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, TaskOverride>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [prioritySort, setPrioritySort] = useState<PrioritySort>("none");
  const [priorityOverrides, setPriorityOverrides] = useState<
    Record<string, TasksV2Priority>
  >({});
  const today = getTodayDateString();

  useEffect(() => {
    setPriorityOverrides(loadTasksEasePriorities());
  }, []);

  function resolvePriority(task: TaskHubTaskItem): TasksV2Priority {
    return priorityOverrides[task.id] ?? deriveTaskPriority(task, today);
  }

  const flatRows = useMemo(() => {
    const rows: { group: TasksV2EventGroup; task: TaskHubTaskItem }[] = [];
    for (const group of eventGroups) {
      for (const task of group.tasks) {
        rows.push({ group, task });
      }
    }
    if (prioritySort === "none") return rows;
    const rankFor = (task: TaskHubTaskItem) =>
      PRIORITY_RANK[
        priorityOverrides[task.id] ?? deriveTaskPriority(task, today)
      ];
    return [...rows].sort((a, b) => {
      const delta = rankFor(a.task) - rankFor(b.task);
      return prioritySort === "asc" ? delta : -delta;
    });
  }, [eventGroups, prioritySort, today, priorityOverrides]);

  function resolveTask(task: TaskHubTaskItem): TaskHubTaskItem {
    const override = overrides[task.id];
    return override ? { ...task, ...override } : task;
  }

  function clearOverride(taskId: string) {
    setOverrides((current) => {
      if (!(taskId in current)) return current;
      const next = { ...current };
      delete next[taskId];
      return next;
    });
  }

  function setPending(taskId: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  }

  function handleStatusChange(
    task: TaskHubTaskItem,
    status: EventPlaybookTaskStatus,
  ) {
    if (pendingIds.has(task.id) || resolveTask(task).status === status) {
      return;
    }
    setOverrides((current) => ({
      ...current,
      [task.id]: { ...current[task.id], status },
    }));
    setPending(task.id, true);
    startTransition(async () => {
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        status,
        task.title,
      );
      setPending(task.id, false);
      if (!result.success) clearOverride(task.id);
    });
  }

  function toggleDone(task: TaskHubTaskItem) {
    const current = resolveTask(task);
    handleStatusChange(task, current.status === "done" ? "todo" : "done");
  }

  function handleAssigneeChange(
    task: TaskHubTaskItem,
    next: {
      assigneeUserId: string | null;
      assigneeName: string | null;
      assigneeInitials: string | null;
    },
  ) {
    if (pendingIds.has(task.id)) return;
    setOverrides((current) => ({
      ...current,
      [task.id]: { ...current[task.id], ...next },
    }));
    setPending(task.id, true);
    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        task.eventId,
        task.id,
        next,
        task.title,
      );
      setPending(task.id, false);
      if (!result.success) clearOverride(task.id);
    });
  }

  function handleDueDateChange(task: TaskHubTaskItem, nextDue: string) {
    if (pendingIds.has(task.id)) return;
    const dueDate = nextDue.trim() || null;
    setOverrides((current) => ({
      ...current,
      [task.id]: { ...current[task.id], dueDate },
    }));
    setPending(task.id, true);
    startTransition(async () => {
      const result = await updateTaskHubTaskAction(
        task.eventId,
        task.id,
        { dueDate },
        task.title,
      );
      setPending(task.id, false);
      if (!result.success) clearOverride(task.id);
    });
  }

  function handlePriorityChange(
    task: TaskHubTaskItem,
    priority: TasksV2Priority,
  ) {
    saveTaskPriority(task.id, priority);
    setPriorityOverrides((current) => ({ ...current, [task.id]: priority }));
  }

  function cyclePrioritySort() {
    setPrioritySort((current) =>
      current === "none" ? "asc" : current === "asc" ? "desc" : "none",
    );
  }

  if (eventGroups.length === 0 || flatRows.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-dashed border-[#e8e2d9] bg-white/70 px-6 py-12 text-center">
        <strong
          className="mb-2 block text-[22px] font-semibold text-[#2a2622]"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif" }}
        >
          {emptyTitle}
        </strong>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[#5c5752]">
          {emptyBody}
        </p>
      </div>
    );
  }

  const rowCount = flatRows.length;

  return (
    <div className="rounded-2xl border border-[#e8e2d9] bg-white pb-28 shadow-[0_4px_20px_-4px_rgba(47,74,60,0.08)]">
      <div className="overflow-x-auto overflow-y-visible">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#e8e2d9] bg-[#faf8f5]/50 text-[11px] font-bold tracking-widest text-[#a8a29c] uppercase">
            <th className="w-12 px-6 py-4 text-center" aria-label="Done" />
            <th className="px-6 py-4">Task</th>
            <th className="px-6 py-4">
              <button
                type="button"
                onClick={cyclePrioritySort}
                className="inline-flex items-center gap-1 uppercase transition hover:text-[#2a2622]"
                aria-label={`Sort by priority${
                  prioritySort === "none"
                    ? ""
                    : prioritySort === "asc"
                      ? ", high to low"
                      : ", low to high"
                }`}
              >
                Priority
                <span className="text-[10px] opacity-70" aria-hidden>
                  {prioritySort === "asc" ? "↑" : prioritySort === "desc" ? "↓" : "⇅"}
                </span>
              </button>
            </th>
            <th className="px-6 py-4">Event</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Due Date</th>
            <th className="px-6 py-4">Assignee</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e8e2d9]">
          {flatRows.map(({ group, task: rawTask }, rowIndex) => {
            const task = resolveTask(rawTask);
            const isPending = pendingIds.has(rawTask.id);
            const isDone = task.status === "done";
            const stripeColor = eventColors[group.eventId] ?? group.accentColor;
            const due = formatDueCell(task, today);
            const priority = resolvePriority(task);
            const isNearBottom = rowIndex >= rowCount - 2;
            const needsYou =
              Boolean(viewerUserId) &&
              task.assigneeUserId === viewerUserId &&
              !isDone;
            const hasNotes = Boolean(task.notes?.trim());
            const highlightBlocked = task.status === "blocked" && !isDone;
            const notePreview = task.notes?.trim()
              ? task.notes.trim().length > 48
                ? `${task.notes.trim().slice(0, 48)}…`
                : task.notes.trim()
              : null;

            return (
              <tr
                key={rawTask.id}
                className={cn(
                  "group transition-all",
                  isDone &&
                    "opacity-60 grayscale hover:opacity-100 hover:grayscale-0",
                  highlightBlocked &&
                    "border-l-4 border-amber-400 bg-amber-50/20 hover:bg-amber-50/40",
                  due.overdue &&
                    !highlightBlocked &&
                    !isDone &&
                    "bg-[#fdf8eb]/40 hover:bg-[#fdf8eb]/60",
                  !highlightBlocked &&
                    !due.overdue &&
                    !isDone &&
                    "hover:bg-[#faf8f5]/40",
                )}
                style={
                  !highlightBlocked
                    ? { borderLeft: `4px solid ${stripeColor}` }
                    : undefined
                }
              >
                <td className="px-6 py-4 text-center">
                  {isDone ? (
                    <button
                      type="button"
                      onClick={() => toggleDone(rawTask)}
                      disabled={!canEdit || isPending}
                      aria-pressed
                      aria-label={`Mark "${task.title}" not done`}
                      className="text-[#2f4a3c] disabled:opacity-50"
                    >
                      <Check className="mx-auto h-4 w-4" aria-hidden />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleDone(rawTask)}
                      disabled={!canEdit || isPending}
                      aria-pressed={false}
                      aria-label={`Mark "${task.title}" done`}
                      className={cn(
                        "mx-auto flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] border-[#e8e2d9] bg-white text-[#a8a29c] transition hover:border-[#2f4a3c] hover:text-[#2f4a3c]",
                        (!canEdit || isPending) && "opacity-60",
                      )}
                    />
                  )}
                </td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => onOpenTask(rawTask)}
                    className="min-w-0 text-left"
                  >
                    <span className="flex items-center gap-2">
                      <strong
                        className={cn(
                          "block text-sm font-bold text-[#2a2622]",
                          isDone && "text-cos-muted line-through",
                        )}
                      >
                        {task.title}
                      </strong>
                      {hasNotes ? (
                        <Paperclip
                          className="h-2.5 w-2.5 shrink-0 text-[#a8a29c]"
                          aria-label="Has notes"
                        />
                      ) : null}
                    </span>
                    {notePreview && !isDone ? (
                      <p className="mt-0.5 text-[12px] text-[#5c5752]">
                        {notePreview}
                      </p>
                    ) : null}
                  </button>
                </td>
                <td className="px-6 py-4">
                  {canEdit ? (
                    <div className="relative inline-flex min-w-[7.25rem] items-center">
                      <span
                        className={cn(
                          "pointer-events-none absolute left-2 z-10",
                          PRIORITY_SELECT_STYLE[priority],
                        )}
                      >
                        <PriorityIcon priority={priority} />
                      </span>
                      <select
                        value={priority}
                        disabled={isPending}
                        aria-label={`Priority for ${task.title}`}
                        onChange={(event) =>
                          handlePriorityChange(
                            rawTask,
                            event.target.value as TasksV2Priority,
                          )
                        }
                        className={cn(
                          "w-full cursor-pointer appearance-none rounded-lg border border-[#e8e2d9] bg-[#faf8f5] py-1 pl-7 pr-7 text-[10px] font-bold uppercase",
                          "outline-none focus-visible:border-[#c4922e] focus-visible:ring-2 focus-visible:ring-[#c4922e]/25",
                          PRIORITY_SELECT_STYLE[priority],
                          isPending && "opacity-60",
                        )}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {tasksV2PriorityLabel(option)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-1.5 h-3 w-3 text-[#a8a29c]"
                        aria-hidden
                      />
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase",
                        PRIORITY_SELECT_STYLE[priority],
                      )}
                    >
                      <PriorityIcon priority={priority} />
                      {tasksV2PriorityLabel(priority)}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <DashboardWidgetColorPicker
                      label={group.eventTitle}
                      value={eventColors[group.eventId] ?? null}
                      swatchColor={group.accentColor}
                      variant="dot"
                      onChange={(color) =>
                        onEventColorChange(group.eventId, color)
                      }
                    />
                    <Link
                      href={group.eventHref}
                      className="text-[12px] font-medium text-[#5c5752] hover:text-[#2a2622] hover:underline"
                    >
                      {group.eventTitle}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <TasksV2StatusPill
                    status={task.status}
                    disabled={!canEdit || isPending}
                    onStatusChange={
                      canEdit
                        ? (status) => handleStatusChange(rawTask, status)
                        : undefined
                    }
                    className={
                      task.status === "blocked"
                        ? "!bg-amber-100 !text-amber-700 uppercase tracking-tighter"
                        : task.status === "done"
                          ? "!bg-[#f0f3f1] !text-[#2f4a3c] uppercase tracking-tighter"
                          : "uppercase tracking-tighter"
                    }
                  />
                </td>
                <td
                  className={cn(
                    "relative overflow-visible px-6 py-4",
                    isNearBottom && "z-20",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col gap-1 overflow-visible",
                      isNearBottom && "relative z-20",
                    )}
                  >
                    {canEdit ? (
                      <div className="relative inline-block max-w-[11rem]">
                        <input
                          type="date"
                          value={effectiveDue(task) ?? ""}
                          disabled={isPending}
                          aria-label={`Due date for ${task.title}`}
                          onChange={(event) =>
                            handleDueDateChange(rawTask, event.target.value)
                          }
                          className={cn(
                            "w-full rounded-lg border border-[#e8e2d9] bg-[#faf8f5] py-1 pr-8 pl-2 text-[12px] text-[#5c5752] [color-scheme:light]",
                            "outline-none focus-visible:border-[#c4922e] focus-visible:ring-2 focus-visible:ring-[#c4922e]/25",
                            due.overdue &&
                              "border-[#e8d5a8] font-bold text-[#a67b27]",
                            isPending && "opacity-60",
                          )}
                        />
                        <Calendar
                          className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-[#a8a29c]"
                          aria-hidden
                        />
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "text-[12px] text-[#5c5752]",
                          due.overdue && "font-bold text-[#a67b27]",
                        )}
                      >
                        {due.label}
                      </span>
                    )}
                    {due.overdue ? (
                      <button
                        type="button"
                        onClick={() => onOpenTask(rawTask)}
                        className="flex items-center gap-1 text-[9px] font-bold text-[#c4922e] uppercase hover:text-[#a67b27]"
                      >
                        <Flag className="h-2.5 w-2.5" aria-hidden />
                        Escalate
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <TasksV2AssigneeSelect
                      assigneeUserId={task.assigneeUserId}
                      assigneeName={task.assigneeName}
                      assigneeInitials={task.assigneeInitials}
                      orgMembers={orgMembers}
                      canEdit={canEdit}
                      disabled={isPending}
                      onChange={(next) => handleAssigneeChange(rawTask, next)}
                    />
                    {needsYou ? (
                      <span className="text-[10px] font-bold tracking-tighter text-amber-700 uppercase">
                        Needs You
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {isDone ? (
                    <Check className="ml-auto h-4 w-4 text-[#2f4a3c]" aria-hidden />
                  ) : highlightBlocked ? (
                    <button
                      type="button"
                      onClick={() => onOpenTask(rawTask)}
                      className="rounded-lg border border-amber-400 bg-white px-4 py-1.5 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100"
                    >
                      Review
                    </button>
                  ) : (
                    <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      {due.overdue ? (
                        <button
                          type="button"
                          onClick={() => onOpenTask(rawTask)}
                          aria-label={`Escalate ${task.title}`}
                          title="Flag for follow-up"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#c4922e] transition hover:border-[#e8e2d9] hover:bg-white"
                        >
                          <Flag className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => onOpenTask(rawTask)}
                        aria-label={`Edit ${task.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#a8a29c] transition hover:border-[#e8e2d9] hover:bg-white hover:text-[#2a2622]"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenTask(rawTask)}
                        aria-label={`More actions for ${task.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#a8a29c] transition hover:border-[#e8e2d9] hover:bg-white hover:text-[#2a2622]"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
