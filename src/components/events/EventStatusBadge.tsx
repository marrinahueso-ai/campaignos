import type { EventStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";

const statusConfig: Record<
  EventStatus,
  {
    label: string;
    variant: "default" | "success" | "warning" | "info";
    className?: string;
  }
> = {
  draft: {
    label: "Draft",
    variant: "warning",
    className: "bg-cos-brand-mustard-soft text-cos-brand-navy",
  },
  scheduled: {
    label: "Scheduled",
    variant: "info",
    className: "bg-cos-brand-navy-soft text-cos-brand-navy",
  },
  published: {
    label: "Published",
    variant: "success",
    className: "bg-cos-brand-sage-soft text-cos-brand-sage",
  },
  archived: {
    label: "Archived",
    variant: "warning",
    className: "bg-cos-brand-terracotta-soft text-cos-brand-terracotta",
  },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
