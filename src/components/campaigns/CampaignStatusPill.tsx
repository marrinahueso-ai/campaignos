import { Badge } from "@/components/ui/Badge";
import type { CampaignDisplayStatus } from "@/lib/events/campaign-page-filters";
import { cn } from "@/lib/utils/cn";

const STATUS_CONFIG: Record<
  CampaignDisplayStatus,
  { label: string; variant: "default" | "success" | "warning" | "info"; className?: string }
> = {
  draft: { label: "Draft", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "success" },
  queued: { label: "Queued", variant: "info" },
  filled: {
    label: "Filled",
    variant: "success",
    className: "border border-teal-200 bg-teal-50 text-teal-800",
  },
  completed: { label: "Completed", variant: "default" },
};

interface CampaignStatusPillProps {
  status: CampaignDisplayStatus;
  className?: string;
}

export function CampaignStatusPill({ status, className }: CampaignStatusPillProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
