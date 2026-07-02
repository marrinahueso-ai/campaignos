import { EmptyState } from "@/components/ui/EmptyState";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { formatDateTime } from "@/lib/utils/dates";
import type {
  ApprovalRequest,
  CommunicationItem,
} from "@/types/event-workspace";
import { ClipboardCheck } from "lucide-react";

interface EventApprovalsSectionProps {
  approvalRequests: ApprovalRequest[];
  communications: CommunicationItem[];
}

function resolveCommunicationLabel(
  communicationItemId: string | null,
  communications: CommunicationItem[],
): string {
  if (!communicationItemId) return "Board approval";

  const item = communications.find((entry) => entry.id === communicationItemId);
  if (!item) return "Board approval";

  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === item.channel)
      ?.label ?? item.channel
  );
}

function statusLabel(
  status: ApprovalRequest["status"],
  assigneeDisplayName: string | null,
): string {
  switch (status) {
    case "pending":
      return assigneeDisplayName
        ? `Waiting on ${assigneeDisplayName}`
        : "Waiting on approval";
    case "approved":
      return "Ready";
    case "rejected":
      return "Changes requested";
    default:
      return status;
  }
}

export function EventApprovalsSection({
  approvalRequests,
  communications,
}: EventApprovalsSectionProps) {
  if (approvalRequests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="You're all caught up"
        description="Nothing needs board sign-off right now."
      />
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader className="border-b border-cos-border px-6 py-5">
        <CardTitle>Approvals</CardTitle>
        <CardDescription>
          Track what is waiting on others and what is ready to move forward.
        </CardDescription>
      </CardHeader>

      <ul className="divide-y divide-cos-border">
        {approvalRequests.map((request) => {
          const label = resolveCommunicationLabel(
            request.communicationItemId,
            communications,
          );

          return (
            <li
              key={request.id}
              className="flex flex-wrap items-baseline justify-between gap-3 px-6 py-4"
            >
              <div>
                <p className="text-sm font-medium text-cos-text">{label}</p>
                <p className="mt-0.5 text-xs text-cos-muted">
                  Requested {formatDateTime(request.requestedAt)}
                </p>
              </div>
              <span className="text-sm text-cos-muted">
                {statusLabel(request.status, request.assigneeDisplayName)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
