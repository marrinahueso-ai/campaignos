"use client";

import { taskStatusLabel } from "@/lib/event-playbooks/task-status";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

interface TaskHubStatusPillProps {
  status: EventPlaybookTaskStatus;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const STATUS_PILL_CLASS: Record<EventPlaybookTaskStatus, string> = {
  todo: "cos-status-pill cos-status-pill--todo",
  in_progress: "cos-status-pill cos-status-pill--in-progress",
  blocked: "cos-status-pill cos-status-pill--blocked",
  done: "cos-status-pill cos-status-pill--done",
};

export function TaskHubStatusPill({
  status,
  onClick,
  disabled,
  className,
}: TaskHubStatusPillProps) {
  const label = taskStatusLabel(status);
  const pillClass = STATUS_PILL_CLASS[status];

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(pillClass, "cursor-pointer disabled:opacity-50", className)}
        aria-label={`Change status from ${label}`}
      >
        {label}
      </button>
    );
  }

  return <span className={cn(pillClass, className)}>{label}</span>;
}
