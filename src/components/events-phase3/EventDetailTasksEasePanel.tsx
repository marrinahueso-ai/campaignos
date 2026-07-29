"use client";

import { useMemo, useState, useTransition } from "react";
import {
  EaseBtnPrimary,
  EaseBtnSecondary,
  EaseBox,
  EaseBoxDesc,
  EaseBoxTitle,
  EaseChip,
  EaseFocusCard,
  EaseQueue,
  EaseRow,
  EaseSectionLabel,
  EaseSoftActions,
  EaseSplit,
} from "@/components/events-phase3/EventDetailEaseUi";
import { useEventTabMutationRefresh } from "@/components/events-phase3/EventDetailTabInvalidation";
import { EventContextFileUpload } from "@/components/campaign-files/EventContextFileUpload";
import { updateTaskHubTaskStatusAction } from "@/lib/task-hub/actions";
import type { TaskHubTaskItem } from "@/types/task-hub";
import type { TasksV2PageData } from "@/types/tasks-v2";

function collectTasks(data: TasksV2PageData): TaskHubTaskItem[] {
  if (data.eventGroups?.length) {
    return data.eventGroups.flatMap((group) => group.tasks);
  }
  return data.committees.flatMap((committee) => committee.tasks);
}

function isOpen(task: TaskHubTaskItem): boolean {
  return task.status !== "done";
}

function formatDue(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  try {
    return new Date(`${dueDate}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dueDate;
  }
}

function dueSoon(task: TaskHubTaskItem): boolean {
  if (!task.dueDate || task.status === "done") return false;
  const due = new Date(`${task.dueDate}T12:00:00`).getTime();
  if (Number.isNaN(due)) return false;
  const days = (due - Date.now()) / (24 * 60 * 60 * 1000);
  return days <= 3;
}

function statusTone(
  task: TaskHubTaskItem,
): "needs" | "open" | "done" | "sched" {
  if (task.status === "done") return "done";
  if (task.status === "blocked") return "sched";
  if (task.status === "in_progress") return "needs";
  return "open";
}

function statusLabel(task: TaskHubTaskItem): string {
  switch (task.status) {
    case "done":
      return "Done";
    case "blocked":
      return "Blocked";
    case "in_progress":
      return "Ready";
    default:
      return "Open";
  }
}

function sortOpen(tasks: TaskHubTaskItem[]): TaskHubTaskItem[] {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? new Date(`${a.dueDate}T12:00:00`).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(`${b.dueDate}T12:00:00`).getTime() : Infinity;
    return aDue - bDue;
  });
}

export function EventDetailTasksEasePanel({
  data,
}: {
  data: TasksV2PageData;
}) {
  const refresh = useEventTabMutationRefresh("tasks");
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openTasks = useMemo(
    () => sortOpen(collectTasks(data).filter(isOpen)),
    [data],
  );

  const eventId =
    data.eventGroups[0]?.eventId ?? openTasks[0]?.eventId ?? null;

  const focus =
    openTasks.find((task) => task.id === selectedId) ?? openTasks[0] ?? null;

  const thisWeek = useMemo(() => {
    if (!focus) return openTasks.slice(0, 3);
    return openTasks.filter((task) => task.id !== focus.id).slice(0, 3);
  }, [openTasks, focus]);

  const alsoOpen = useMemo(() => {
    const shown = new Set([
      ...(focus ? [focus.id] : []),
      ...thisWeek.map((task) => task.id),
    ]);
    return openTasks.filter((task) => !shown.has(task.id));
  }, [openTasks, focus, thisWeek]);

  const markDone = (task: TaskHubTaskItem) => {
    startTransition(async () => {
      setError(null);
      const result = await updateTaskHubTaskStatusAction(
        task.eventId,
        task.id,
        "done",
        task.title,
      );
      if (!result.success) {
        setError(result.error ?? "Could not mark done. Try again.");
        return;
      }
      await refresh();
    });
  };

  if (openTasks.length === 0) {
    return (
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <EaseSectionLabel hint="For this event only — full board is under Tasks">
            Needs you next
          </EaseSectionLabel>
          {eventId ? (
            <EventContextFileUpload eventId={eventId} uploadContext="tasks" disabled={pending} />
          ) : null}
        </div>
        <p className="rounded-[18px] border border-cos-border bg-[rgba(255,252,247,0.55)] px-5 py-10 text-center text-sm text-cos-muted">
          No open tasks for this event. You’re clear for now.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <EaseSectionLabel hint="For this event only — full board is under Tasks">
          Needs you next
        </EaseSectionLabel>
        {eventId ? (
          <EventContextFileUpload
            eventId={eventId}
            uploadContext="tasks"
            disabled={pending}
            onUploaded={() => {
              void refresh();
            }}
          />
        ) : null}
      </div>

      {error ? (
        <p className="mb-3 text-sm text-[#a65a3a]">{error}</p>
      ) : null}

      <EaseSplit>
        {focus ? (
          <EaseFocusCard artClassName="from-[#0b2f5b] via-[#2f9fb3] to-[#7fd0df]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-cos-muted">
              {dueSoon(focus) ? (
                <EaseChip tone="warn">Due soon</EaseChip>
              ) : (
                <EaseChip tone="forest">{statusLabel(focus)}</EaseChip>
              )}
              <span>{formatDue(focus.dueDate)}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-cos-text">
              {focus.title}
            </h2>
            <p className="m-0 text-sm leading-relaxed text-cos-muted">
              {focus.notes?.trim() ||
                (focus.assigneeName
                  ? `Assigned to ${focus.assigneeName}.`
                  : "Open the task to add notes or reassign.")}
            </p>
            <EaseSoftActions>
              <EaseBtnPrimary
                disabled={pending || !data.canEdit}
                onClick={() => markDone(focus)}
              >
                Mark done
              </EaseBtnPrimary>
              <EaseBtnSecondary onClick={() => setSelectedId(focus.id)}>
                Open task
              </EaseBtnSecondary>
            </EaseSoftActions>
          </EaseFocusCard>
        ) : null}

        <EaseBox>
          <EaseBoxTitle>This week</EaseBoxTitle>
          <EaseBoxDesc>Other open tasks coming due soon.</EaseBoxDesc>
          <EaseQueue>
            {thisWeek.length === 0 ? (
              <p className="text-xs text-cos-muted">No other tasks this week.</p>
            ) : (
              thisWeek.map((task) => (
                <EaseRow
                  key={task.id}
                  title={task.title}
                  meta={`${task.assigneeName ?? "Unassigned"} · ${formatDue(task.dueDate)}`}
                  status={statusLabel(task)}
                  statusTone={statusTone(task)}
                  onClick={() => setSelectedId(task.id)}
                />
              ))
            )}
          </EaseQueue>
        </EaseBox>
      </EaseSplit>

      {alsoOpen.length > 0 ? (
        <div className="mt-[22px]">
          <EaseSectionLabel>Also open · {alsoOpen.length} more</EaseSectionLabel>
          <EaseQueue>
            {alsoOpen.map((task) => (
              <EaseRow
                key={task.id}
                title={task.title}
                meta={`${task.assigneeName ?? "Unassigned"} · ${formatDue(task.dueDate)}`}
                status={statusLabel(task)}
                statusTone={statusTone(task)}
                onClick={() => setSelectedId(task.id)}
              />
            ))}
          </EaseQueue>
        </div>
      ) : null}
    </section>
  );
}
