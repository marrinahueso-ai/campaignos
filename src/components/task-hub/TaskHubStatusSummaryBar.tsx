"use client";

import { taskStatusLabel } from "@/lib/event-playbooks/task-status";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

const STATUS_ORDER: EventPlaybookTaskStatus[] = [
  "done",
  "in_progress",
  "blocked",
  "todo",
];

const STATUS_SEGMENT_CLASS: Record<EventPlaybookTaskStatus, string> = {
  todo: "bg-[var(--cos-status-todo)]",
  in_progress: "bg-[var(--cos-status-progress)]",
  blocked: "bg-[var(--cos-status-blocked)]",
  done: "bg-[var(--cos-status-done)]",
};

interface TaskHubStatusSummaryBarProps {
  counts: Record<EventPlaybookTaskStatus, number>;
  className?: string;
}

export function TaskHubStatusSummaryBar({
  counts,
  className,
}: TaskHubStatusSummaryBarProps) {
  const total = STATUS_ORDER.reduce((sum, status) => sum + counts[status], 0);
  if (total === 0) {
    return null;
  }

  const segments = STATUS_ORDER.filter((status) => counts[status] > 0);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="flex h-1.5 min-w-[5rem] flex-1 max-w-[8rem] overflow-hidden rounded-full bg-cos-bg-alt"
        role="img"
        aria-label={segments
          .map((status) => `${counts[status]} ${taskStatusLabel(status)}`)
          .join(", ")}
      >
        {segments.map((status) => (
          <div
            key={status}
            className={cn("h-full transition-all", STATUS_SEGMENT_CLASS[status])}
            style={{ width: `${(counts[status] / total) * 100}%` }}
          />
        ))}
      </div>
      <span className="hidden text-[10px] text-cos-muted tabular-nums sm:inline">
        {total} tasks
      </span>
    </div>
  );
}

export function countTasksByStatus(
  tasks: { status: EventPlaybookTaskStatus }[],
): Record<EventPlaybookTaskStatus, number> {
  const counts: Record<EventPlaybookTaskStatus, number> = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  };
  for (const task of tasks) {
    counts[task.status]++;
  }
  return counts;
}
