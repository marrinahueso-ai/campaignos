"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import { TasksV2AssigneeSelect } from "@/components/tasks-v2/TasksV2AssigneeSelect";
import { TasksV2StatusPill } from "@/components/tasks-v2/TasksV2StatusPill";
import {
  updateTaskHubTaskAction,
  updateTaskHubTaskStatusAction,
} from "@/lib/task-hub/actions";
import { deriveTaskPriority } from "@/lib/tasks-v2/derive-priority";
import { tasksV2PriorityLabel } from "@/lib/tasks-v2/status-labels";
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
}

type TaskOverride = Partial<
  Pick<
    TaskHubTaskItem,
    "status" | "dueDate" | "assigneeUserId" | "assigneeName" | "assigneeInitials"
  >
>;

function dueLine(task: TaskHubTaskItem): string {
  const priority = tasksV2PriorityLabel(deriveTaskPriority(task));
  if (task.status === "done") {
    return "Done";
  }
  const due = task.monday?.mondayDueDate ?? task.dueDate;
  if (!due) {
    return `No due date · ${priority}`;
  }
  const today = getTodayDateString();
  const label =
    due < today
      ? "Overdue"
      : `Due ${formatLocalDate(due, { month: "short", day: "numeric" })}`;
  return `${label} · ${priority}`;
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
}: TasksEaseListProps) {
  const [, startTransition] = useTransition();
  const [overrides, setOverrides] = useState<Record<string, TaskOverride>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());

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
      if (pending) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
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
      if (!result.success) {
        clearOverride(task.id);
      }
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
      if (!result.success) {
        clearOverride(task.id);
      }
    });
  }

  if (eventGroups.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-cos-border bg-[rgba(255,252,247,0.55)] px-6 py-12 text-center">
        <strong className="mb-2 block font-display text-[22px] font-semibold text-cos-text">
          {emptyTitle}
        </strong>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-cos-muted">
          {emptyBody}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {eventGroups.map((group) => {
        const stripeColor = eventColors[group.eventId] ?? group.accentColor;
        const openCount = Math.max(0, group.totalCount - group.doneCount);

        return (
          <article
            key={group.eventId}
            className="flex flex-col gap-2 rounded-[22px] border border-cos-border bg-cos-card p-4 shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
            style={{ borderLeft: `4px solid ${stripeColor}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <DashboardWidgetColorPicker
                label={group.eventTitle}
                value={eventColors[group.eventId] ?? null}
                swatchColor={group.accentColor}
                variant="dot"
                onChange={(color) => onEventColorChange(group.eventId, color)}
              />
              <h3 className="flex min-w-0 flex-1 flex-wrap items-center gap-2 font-display text-lg font-semibold text-cos-text">
                <Link
                  href={group.eventHref}
                  className="truncate transition-colors hover:underline"
                >
                  {group.eventTitle}
                </Link>
                <span
                  className="inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-[0.04em] text-cos-text uppercase"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${stripeColor} 14%, transparent)`,
                  }}
                >
                  {formatLocalDate(group.eventDate, {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {openCount} open
                </span>
              </h3>
            </div>

            <div className="flex flex-col gap-1.5">
              {group.tasks.map((rawTask) => {
                const task = resolveTask(rawTask);
                const isPending = pendingIds.has(rawTask.id);
                const isDone = task.status === "done";

                return (
                  <div
                    key={rawTask.id}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-2xl border border-transparent bg-[rgba(255,252,247,0.7)] px-3 py-2.5 transition hover:border-cos-border hover:bg-cos-card hover:shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDone(rawTask)}
                      disabled={!canEdit || isPending}
                      aria-pressed={task.status === "done"}
                      aria-label={
                        task.status === "done"
                          ? `Mark "${task.title}" not done`
                          : `Mark "${task.title}" done`
                      }
                      className={cn(
                        "h-[18px] w-[18px] shrink-0 rounded-[6px] border-[1.5px] transition-colors",
                        task.status === "done"
                          ? "border-[#2f4a3c] bg-[#2f4a3c] shadow-[inset_0_0_0_3px_#fffcf7]"
                          : "border-cos-border bg-cos-card",
                        (!canEdit || isPending) && "opacity-60",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onOpenTask(rawTask)}
                      className="min-w-0 text-left"
                    >
                      <strong
                        className={cn(
                          "block truncate text-sm font-semibold text-cos-text",
                          isDone && "text-cos-muted line-through",
                        )}
                      >
                        {task.title}
                      </strong>
                      <p className="mt-0.5 truncate text-xs text-cos-muted">
                        {dueLine(task)}
                      </p>
                    </button>
                    <TasksV2AssigneeSelect
                      assigneeUserId={task.assigneeUserId}
                      assigneeName={task.assigneeName}
                      assigneeInitials={task.assigneeInitials}
                      orgMembers={orgMembers}
                      canEdit={canEdit}
                      disabled={isPending}
                      onChange={(next) => handleAssigneeChange(rawTask, next)}
                    />
                    <TasksV2StatusPill
                      status={task.status}
                      disabled={!canEdit || isPending}
                      onStatusChange={
                        canEdit
                          ? (status) => handleStatusChange(rawTask, status)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
              {group.tasks.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-cos-muted">
                  No open tasks for this event.
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
