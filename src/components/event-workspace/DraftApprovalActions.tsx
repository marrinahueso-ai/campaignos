"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CheckCircle2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  canApproveDraft,
  canSubmitForApproval,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import {
  approveCommunicationAction,
  requestCommunicationChangesAction,
  sendCommunicationForApprovalAction,
} from "@/lib/event-workspace/actions";
import type { CommunicationStatus } from "@/types/event-workspace";

interface DraftApprovalActionsProps {
  eventId: string;
  communicationItemId: string;
  status: CommunicationStatus;
  userRole: CampaignRole;
  hasContent?: boolean;
  assigneeDisplayName?: string | null;
  canApproveAssigned?: boolean;
}

function canShowApproveButton(
  role: CampaignRole,
  status: CommunicationStatus,
  hasContent: boolean,
  canApproveAssigned: boolean,
): boolean {
  if (!hasContent) {
    return false;
  }

  if (status === "pending_approval") {
    return canApproveAssigned;
  }

  if (!canApproveDraft(role)) {
    return false;
  }

  return status === "generated" || status === "changes_requested";
}

function canShowSendForApprovalButton(
  role: CampaignRole,
  status: CommunicationStatus,
  hasContent: boolean,
): boolean {
  if (canApproveDraft(role) || !canSubmitForApproval(role) || !hasContent) {
    return false;
  }

  return status === "generated" || status === "changes_requested";
}

export function DraftApprovalActions({
  eventId,
  communicationItemId,
  status,
  userRole,
  hasContent = true,
  assigneeDisplayName = null,
  canApproveAssigned = canApproveDraft(userRole),
}: DraftApprovalActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runAction(
    action: () => Promise<{ error: string | null; success: boolean }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        router.refresh();
      }
    });
  }

  const showApprove = canShowApproveButton(
    userRole,
    status,
    hasContent,
    canApproveAssigned,
  );
  const showSendForApproval = canShowSendForApprovalButton(
    userRole,
    status,
    hasContent,
  );
  const showRequestChanges =
    canApproveAssigned && status === "pending_approval";

  if (!showApprove && !showSendForApproval && !showRequestChanges) {
    if (status === "pending_approval") {
      return (
        <p className="text-xs text-cos-muted">
          Waiting on {assigneeDisplayName ?? "approval"}.
        </p>
      );
    }
    if (status === "approved") {
      return <p className="text-xs text-cos-success-text">Approved.</p>;
    }
    if (status === "changes_requested" && !showSendForApproval) {
      return <p className="text-xs text-cos-muted">Changes requested.</p>;
    }
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {showSendForApproval && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            runAction(() =>
              sendCommunicationForApprovalAction(eventId, communicationItemId),
            )
          }
        >
          <Send className="h-4 w-4" />
          Send for approval
        </Button>
      )}
      {showApprove && (
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending}
          onClick={() =>
            runAction(() =>
              approveCommunicationAction(eventId, communicationItemId),
            )
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve
        </Button>
      )}
      {showRequestChanges && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={() => {
            const notes = window.prompt("What should change before approval?");
            if (notes === null) {
              return;
            }
            runAction(() =>
              requestCommunicationChangesAction(
                eventId,
                communicationItemId,
                notes,
              ),
            );
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Request changes
        </Button>
      )}
    </div>
  );
}
