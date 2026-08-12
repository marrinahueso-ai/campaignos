import type { FlyerStatus } from "@/lib/flyers/types";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<
  FlyerStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-cos-bg text-cos-muted border-cos-border",
  },
  needs_approval: {
    label: "Pending Approval",
    className: "bg-blue-50 text-blue-600 border-blue-100",
  },
  changes_requested: {
    label: "Changes Requested",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-[#e6f3ee] text-[#0d7e5e] border-[#0d7e5e]/20",
  },
};

export function FlyerStatusBadge({
  status,
  className,
}: {
  status: FlyerStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-[10px] font-bold tracking-widest uppercase",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
