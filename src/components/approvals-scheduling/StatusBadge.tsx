import type { UnifiedWorkflowStatus } from "@/lib/approvals-scheduling/types";
import { cn } from "@/lib/utils/cn";

const STATUS_STYLES: Record<
  UnifiedWorkflowStatus,
  { label: string; className: string }
> = {
  assigned_to_me: {
    label: "ASSIGNED TO ME",
    className: "bg-[#f3e2c8] text-[#6b4f2d]",
  },
  changes_requested: {
    label: "CHANGES REQUESTED",
    className: "bg-[#f8e3e3] text-[#8b3f3f]",
  },
  scheduled: {
    label: "SCHEDULED",
    className: "bg-cos-success-bg text-cos-success-text",
  },
  posted: {
    label: "POSTED",
    className: "bg-[#e4edf8] text-[#3d5f85]",
  },
  published: {
    label: "PUBLISHED",
    className: "bg-[#dce8dc] text-[#2f4f31]",
  },
  in_queue: {
    label: "IN QUEUE",
    className: "bg-[#efe8dc] text-[#6b5e45]",
  },
};

interface StatusBadgeProps {
  status: UnifiedWorkflowStatus;
  detail: string;
  needsRegeneration?: boolean;
}

export function StatusBadge({
  status,
  detail,
  needsRegeneration = false,
}: StatusBadgeProps) {
  const config = STATUS_STYLES[status];

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em]",
            config.className,
          )}
        >
          {config.label}
        </span>
        {needsRegeneration ? (
          <span className="inline-flex rounded-full bg-[#f8e3e3] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#8b3f3f]">
            NEEDS REGENERATION
          </span>
        ) : null}
      </div>
      <p className="text-xs text-cos-muted">{detail}</p>
    </div>
  );
}
