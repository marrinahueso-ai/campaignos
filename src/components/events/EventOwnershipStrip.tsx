import { User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { EventRosterOwnership } from "@/lib/organization-workspace/resolve-event-roster-ownership";

function SlotBadge({ filled }: { filled: boolean }) {
  return (
    <Badge variant={filled ? "success" : "warning"} className="shrink-0">
      {filled ? "Filled" : "Open"}
    </Badge>
  );
}

interface EventOwnershipStripProps {
  ownership: EventRosterOwnership;
}

export function EventOwnershipStrip({ ownership }: EventOwnershipStripProps) {
  if (!ownership.committeeName) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-lg border border-cos-border bg-cos-bg/60 px-3 py-2.5">
      <p className="inline-flex min-w-0 items-start gap-1.5 text-xs text-cos-text">
        <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cos-muted" />
        <span>
          <span className="font-medium text-cos-muted">Chair · </span>
          {ownership.chairNames.length > 0 ? (
            ownership.chairNames.join(", ")
          ) : (
            <span className="text-cos-muted">{ownership.committeeName}</span>
          )}
        </span>
      </p>
      <SlotBadge filled={ownership.committeeFilled} />
    </div>
  );
}
