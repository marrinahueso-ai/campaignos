import type { EventStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";

const statusConfig: Record<
  EventStatus,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  draft: { label: "Draft", variant: "warning" },
  scheduled: { label: "Scheduled", variant: "info" },
  published: { label: "Published", variant: "success" },
  archived: { label: "Archived", variant: "warning" },
};

interface EventStatusBadgeProps {
  status: EventStatus;
}

export function EventStatusBadge({ status }: EventStatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
