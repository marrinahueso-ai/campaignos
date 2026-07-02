import { cn } from "@/lib/utils/cn";
import { WORKLOAD_LABELS, WORKLOAD_STYLES } from "@/lib/communications-calendar/constants";
import type { WorkloadLevel } from "@/types/communications-calendar";

interface WorkloadBadgeProps {
  level: WorkloadLevel;
  className?: string;
}

export function WorkloadBadge({ level, className }: WorkloadBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        WORKLOAD_STYLES[level],
        className,
      )}
    >
      {WORKLOAD_LABELS[level]}
    </span>
  );
}
