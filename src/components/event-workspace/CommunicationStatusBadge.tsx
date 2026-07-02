import type { CommunicationStatus } from "@/types/event-workspace";
import { Badge } from "@/components/ui/Badge";

const statusConfig: Record<
  CommunicationStatus,
  { label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  draft: { label: "Draft", variant: "default" },
  generated: { label: "Draft ready", variant: "info" },
  pending_approval: { label: "Waiting on approval", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  changes_requested: { label: "Changes requested", variant: "warning" },
  published: { label: "Published", variant: "success" },
};

interface CommunicationStatusBadgeProps {
  status: CommunicationStatus;
  isPublished?: boolean;
}

export function CommunicationStatusBadge({
  status,
  isPublished = false,
}: CommunicationStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={config.variant}>{config.label}</Badge>
      {isPublished && status !== "published" && (
        <Badge className="bg-cos-success-bg text-cos-success-text ring-1 ring-inset ring-cos-success/20">
          Published
        </Badge>
      )}
    </div>
  );
}
