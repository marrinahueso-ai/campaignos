"use client";

import { tasksV2PriorityLabel } from "@/lib/tasks-v2/status-labels";
import { cn } from "@/lib/utils/cn";
import type { TasksV2Priority } from "@/types/tasks-v2";

interface TasksV2PriorityPillProps {
  priority: TasksV2Priority;
  className?: string;
}

const PRIORITY_STYLES: Record<TasksV2Priority, string> = {
  high: "bg-[#f4e0dc] text-[#8b4f4f]",
  medium: "bg-[#f4eadc] text-[#8b6f4d]",
  low: "bg-[#dce8f4] text-[#3d5f7a]",
};

export function TasksV2PriorityPill({ priority, className }: TasksV2PriorityPillProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold",
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {tasksV2PriorityLabel(priority)}
    </span>
  );
}
