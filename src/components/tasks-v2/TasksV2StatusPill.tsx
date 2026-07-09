"use client";

import {
  TASKS_V2_STATUS_OPTIONS,
  tasksV2StatusLabel,
} from "@/lib/tasks-v2/status-labels";
import { cn } from "@/lib/utils/cn";
import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";

interface TasksV2StatusPillProps {
  status: EventPlaybookTaskStatus;
  onStatusChange?: (status: EventPlaybookTaskStatus) => void;
  disabled?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<EventPlaybookTaskStatus, string> = {
  todo: "bg-[#ece8e0] text-[#6b6560]",
  in_progress: "bg-[#dce8f4] text-[#3d5f7a]",
  blocked: "bg-[#f4e0dc] text-[#8b4f4f]",
  done: "bg-[#dce8dc] text-[#3f5240]",
};

export function TasksV2StatusPill({
  status,
  onStatusChange,
  disabled,
  className,
}: TasksV2StatusPillProps) {
  const label = tasksV2StatusLabel(status);

  if (onStatusChange) {
    return (
      <select
        value={status}
        disabled={disabled}
        onChange={(event) =>
          onStatusChange(event.target.value as EventPlaybookTaskStatus)
        }
        aria-label={`Status: ${label}`}
        className={cn(
          "inline-flex cursor-pointer appearance-none rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none transition-opacity disabled:opacity-50",
          STATUS_STYLES[status],
          className,
        )}
      >
        {TASKS_V2_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {tasksV2StatusLabel(option)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
