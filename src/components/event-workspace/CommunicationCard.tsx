"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Eye, PenLine, RotateCcw, Send } from "lucide-react";
import { CommunicationStatusBadge } from "@/components/event-workspace/CommunicationStatusBadge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { displayDraftContent } from "@/lib/ai/content";
import { draftCommunicationWithAiAction } from "@/lib/ai/actions";
import {
  canApproveDraft,
  canDraftCommunications,
  canSubmitForApproval,
  type CampaignRole,
} from "@/lib/auth/campaign-roles";
import {
  approveCommunicationAction,
  requestCommunicationChangesAction,
  sendCommunicationForApprovalAction,
} from "@/lib/event-workspace/actions";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { formatDateTime } from "@/lib/utils/dates";
import type { CommunicationItem } from "@/types/event-workspace";

type DraftFeedback = "idle" | "loading" | "success" | "error";

interface CommunicationCardProps {
  eventId: string;
  item: CommunicationItem;
  userRole: CampaignRole;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  onPreview: (item: CommunicationItem) => void;
  onDraftUpdated?: (itemId: string, draftText: string) => void;
  assigneeDisplayName?: string | null;
  canApproveAssigned?: boolean;
}

function getChannelLabel(channel: CommunicationItem["channel"]): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel
  );
}

function hasDraftContent(
  item: CommunicationItem,
  displayContent: string | null,
): boolean {
  if (displayContent) {
    return true;
  }

  return (
    item.status === "generated" ||
    item.status === "pending_approval" ||
    item.status === "changes_requested" ||
    item.status === "approved" ||
    item.status === "published"
  );
}

function canShowApproveButton(
  role: CampaignRole,
  status: CommunicationItem["status"],
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
  status: CommunicationItem["status"],
  hasContent: boolean,
): boolean {
  if (canApproveDraft(role) || !canSubmitForApproval(role) || !hasContent) {
    return false;
  }

  return status === "generated" || status === "changes_requested";
}

export function CommunicationCard({
  eventId,
  item,
  userRole,
  aiAvailable,
  aiUnavailableReason,
  onPreview,
  onDraftUpdated,
  assigneeDisplayName = null,
  canApproveAssigned = canApproveDraft(userRole),
}: CommunicationCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<DraftFeedback>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayContent, setDisplayContent] = useState<string | null>(() =>
    displayDraftContent(item.latestContent),
  );

  useEffect(() => {
    setDisplayContent(displayDraftContent(item.latestContent));
    setFeedback("idle");
    setErrorMessage(null);
    setActionError(null);
  }, [item.id, item.latestContent, item.status]);

  function handleDraft() {
    if (!canDraftCommunications(userRole)) {
      return;
    }

    setFeedback("loading");
    setErrorMessage(null);

    startTransition(async () => {
      const result = await draftCommunicationWithAiAction(
        eventId,
        item.id,
        item.channel,
      );

      if (result.success && result.draftText) {
        setDisplayContent(result.draftText);
        onDraftUpdated?.(item.id, result.draftText);
        setFeedback("success");
        router.refresh();
        return;
      }

      setErrorMessage(result.error ?? "I couldn't draft that yet. Nothing was changed.");
      setFeedback("error");
    });
  }

  function runApprovalAction(
    action: () => Promise<{ error: string | null; success: boolean }>,
  ) {
    setActionError(null);

    startTransition(async () => {
      const result = await action();

      if (!result.success) {
        setActionError(result.error ?? "Something went wrong.");
        return;
      }

      router.refresh();
    });
  }

  function handleApprove() {
    runApprovalAction(() => approveCommunicationAction(eventId, item.id));
  }

  function handleSendForApproval() {
    runApprovalAction(() =>
      sendCommunicationForApprovalAction(eventId, item.id),
    );
  }

  function handleRequestChanges() {
    const notes = window.prompt("What should change before approval?");
    if (notes === null) {
      return;
    }

    runApprovalAction(() =>
      requestCommunicationChangesAction(eventId, item.id, notes),
    );
  }

  const draftLabel = hasDraftContent(item, displayContent)
    ? "Draft again"
    : "Draft this for me";

  const hasContent = hasDraftContent(item, displayContent);
  const showApprove = canShowApproveButton(
    userRole,
    item.status,
    hasContent,
    canApproveAssigned,
  );
  const showSendForApproval = canShowSendForApprovalButton(
    userRole,
    item.status,
    hasContent,
  );
  const showRequestChanges =
    canApproveAssigned && item.status === "pending_approval";

  const previewItem: CommunicationItem = {
    ...item,
    latestContent: displayContent,
  };

  function renderApprovalState() {
    if (item.status === "pending_approval" && !showApprove && !showRequestChanges) {
      return (
        <p className="w-full text-xs text-cos-muted">
          Waiting on {assigneeDisplayName ?? "approval"}.
        </p>
      );
    }

    if (item.status === "approved") {
      return <p className="w-full text-xs text-cos-success-text">Approved.</p>;
    }

    if (item.status === "changes_requested" && !showSendForApproval && !showApprove) {
      return (
        <p className="w-full text-xs text-cos-muted">Changes requested.</p>
      );
    }

    return null;
  }

  return (
    <Card interactive className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{getChannelLabel(item.channel)}</CardTitle>
            <CardDescription className="mt-1">
              Updated {formatDateTime(item.lastUpdated)}
            </CardDescription>
          </div>
          <CommunicationStatusBadge
            status={item.status}
            isPublished={item.isPublished}
          />
        </div>
      </CardHeader>

      <p className="flex-1 px-6 pb-4 text-sm leading-6 text-cos-muted line-clamp-3">
        {displayContent ??
          "Nothing drafted yet. Ask for a first draft when you're ready."}
      </p>

      {feedback === "loading" && (
        <p className="px-6 pb-2 text-xs text-cos-muted">
          Drafting a new version with your campaign assistant…
        </p>
      )}
      {feedback === "success" && (
        <p className="px-6 pb-2 text-xs text-cos-success-text">
          Draft ready. Review and edit before using.
        </p>
      )}
      {feedback === "error" && (
        <p className="px-6 pb-2 text-xs text-cos-muted" role="alert">
          {errorMessage}
        </p>
      )}
      {actionError && (
        <p className="px-6 pb-2 text-xs text-cos-muted" role="alert">
          {actionError}
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-2 border-t border-cos-border p-4">
        {canDraftCommunications(userRole) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleDraft}
            disabled={isPending || !aiAvailable}
            title={!aiAvailable ? (aiUnavailableReason ?? undefined) : undefined}
          >
            <PenLine className="h-4 w-4" />
            {isPending ? "Drafting…" : draftLabel}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onPreview(previewItem)}>
          <Eye className="h-4 w-4" />
          Preview
        </Button>
        {showSendForApproval && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSendForApproval}
            disabled={isPending}
          >
            <Send className="h-4 w-4" />
            Send for approval
          </Button>
        )}
        {showApprove && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleApprove}
            disabled={isPending}
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve
          </Button>
        )}
        {showRequestChanges && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRequestChanges}
            disabled={isPending}
          >
            <RotateCcw className="h-4 w-4" />
            Request changes
          </Button>
        )}
        {renderApprovalState()}
      </div>

      {!aiAvailable && aiUnavailableReason && canDraftCommunications(userRole) && (
        <p className="border-t border-cos-border px-4 pb-4 pt-2 text-xs text-cos-muted">
          {aiUnavailableReason}
        </p>
      )}
    </Card>
  );
}
