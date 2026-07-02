import { cn } from "@/lib/utils/cn";
import type { CampaignReadinessLabel } from "@/lib/campaign-intelligence";

interface CampaignReadinessBadgeProps {
  label: CampaignReadinessLabel;
  display: string;
  className?: string;
}

function labelStyles(label: CampaignReadinessLabel): string {
  switch (label) {
    case "on_track":
      return "bg-cos-success-bg text-cos-success-text";
    case "ready_to_publish":
      return "bg-cos-info text-cos-info-text";
    case "waiting_on_approval":
      return "bg-cos-warning text-cos-warning-text";
    case "needs_attention":
      return "bg-cos-warning text-cos-warning-text";
    case "calendar_only":
      return "bg-cos-bg text-cos-muted ring-1 ring-inset ring-cos-border";
    default:
      return "bg-cos-bg text-cos-muted ring-1 ring-inset ring-cos-border";
  }
}

export function CampaignReadinessBadge({
  label,
  display,
  className,
}: CampaignReadinessBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        labelStyles(label),
        className,
      )}
    >
      {display}
    </span>
  );
}
