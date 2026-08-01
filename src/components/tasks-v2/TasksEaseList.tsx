"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Check, MoreHorizontal, Paperclip, Pencil } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { TasksV2AssigneeSelect } from "@/components/tasks-v2/TasksV2AssigneeSelect";
import { TasksV2StatusPill } from "@/components/tasks-v2/TasksV2StatusPill";
import {
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { formatLocalDate, getTodayDateString } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubOrgMember, TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2EventGroup } from "@/types/tasks-v2";

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

function effectiveDue(task: TaskHubTaskItem): string | null {
  return task.monday?.mondayDueDate ?? task.dueDate ?? null;
}

function formatDueCell(task: TaskHubTaskItem, today: string): {
  label: string;
  overdue: boolean;
} {
  if (task.status === "done") {
    const due = effectiveDue(task);
    return {
      label: due
        ? formatLocalDate(due, { month: "short", day: "numeric" })
        : "—",
      overdue: false,
    };
  }
  const due = effectiveDue(task);
  if (!due) return { label: "—", overdue: false };
  const overdue = due < today;
  const isToday = due === today;
  const dateLabel = formatLocalDate(due, { month: "short", day: "numeric" });
  if (isToday) return { label: "Today", overdue: false };
  if (overdue) return { label: `${dateLabel} (Overdue)`, overdue: true };
  return { label: dateLabel, overdue: false };
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
  const today = getTodayDateString();

  const flatRows = useMemo(() => {
    const rows: { group: TasksV2EventGroup; task: TaskHubTaskItem }[] = [];
    for (const group of eventGroups) {
      for (const task of group.tasks) {
        rows.push({ group, task });
      }
    }
    return rows;
  }, [eventGroups]);

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

  if (eventGroups.length === 0 || flatRows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e8e2d9] bg-white/70 px-6 py-12 text-center">
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

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e2d9] bg-white shadow-[0_4px_20px_-4px_rgba(47,74,60,0.08)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[#e8e2d9] bg-[#faf8f5]/50 text-[11px] font-bold tracking-widest text-[#a8a29c] uppercase">
            <th className="w-12 px-6 py-4 text-center" aria-label="Done" />
            <th className="px-6 py-4">Task</th>
            <th className="px-6 py-4">Event</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Due Date</th>
            <th className="px-6 py-4">Assignee</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e8e2d9]">
          {flatRows.map(({ group, task: rawTask }) => {
            const task = resolveTask(rawTask);
            const isPending = pendingIds.has(rawTask.id);
            const isDone = task.status === "done";
            const stripeColor = eventColors[group.eventId] ?? group.accentColor;
            const due = formatDueCell(task, today);
            const needsYou =
              Boolean(viewerUserId) &&
              task.assigneeUserId === viewerUserId &&
              !isDone;
            const hasNotes = Boolean(task.notes?.trim());
            const highlightBlocked = task.status === "blocked" && !isDone;

            return (
              <tr
                key={rawTask.id}
                className={cn(
                  "group transition-all",
                  isDone && "opacity-60 grayscale hover:opacity-100 hover:grayscale-0",
                  highlightBlocked &&
                    "border-l-4 border-amber-400 bg-amber-50/20 hover:bg-amber-50/40",
                  !highlightBlocked && !isDone && "hover:bg-[#faf8f5]/40",
                  !highlightBlocked && isDone && "hover:bg-[#faf8f5]/30",
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
                  </button>
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
                    "px-6 py-4 text-[12px]",
                    due.overdue
                      ? "font-bold text-[#a67b27]"
                      : "text-[#5c5752]",
                  )}
                >
                  {due.label}
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
  );
}
