"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  approveInboxReplyAction,
  generateInboxAiDraftAction,
  sendInboxReplyAction,
} from "@/lib/inbox/actions";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

interface InboxThreadReplyPanelProps {
  thread: InboxThread;
  messages: InboxMessage[];
}

function statusLabel(status: InboxMessage["status"]): string {
  switch (status) {
    case "approved":
      return "Approved — ready to send";
    case "sent":
      return "Sent";
    case "archived":
      return "Archived";
    default:
      return "Pending review";
  }
}

export function InboxThreadReplyPanel({ thread, messages }: InboxThreadReplyPanelProps) {
  const router = useRouter();
  const replyTarget = useMemo(() => {
    const inbound = messages.filter((message) => message.direction === "inbound");
    const pending = inbound.find(
      (message) => message.status !== "sent" && message.status !== "archived",
    );
    return pending ?? inbound[inbound.length - 1] ?? null;
  }, [messages]);

  const initialBody =
    replyTarget?.approvedBody ??
    replyTarget?.aiDraftBody ??
    "";

  const [draftBody, setDraftBody] = useState(initialBody);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftRequested, setDraftRequested] = useState(false);

  useEffect(() => {
    setDraftBody(initialBody);
    setIsEditing(false);
    setActionError(null);
    setDraftRequested(false);
  }, [replyTarget?.id, initialBody]);

  const requestDraft = useCallback(() => {
    if (!replyTarget) {
      return;
    }

    startTransition(async () => {
      setActionError(null);
      const result = await generateInboxAiDraftAction({
        threadId: thread.id,
        messageId: replyTarget.id,
      });

      if (!result.success) {
        setActionError(result.error ?? "Could not generate draft.");
        return;
      }

      if (result.draftBody) {
        setDraftBody(result.draftBody);
      }
      router.refresh();
    });
  }, [replyTarget, router, thread.id]);

  useEffect(() => {
    if (
      !replyTarget ||
      draftRequested ||
      replyTarget.aiDraftBody ||
      replyTarget.approvedBody ||
      replyTarget.status === "sent"
    ) {
      return;
    }

    setDraftRequested(true);
    requestDraft();
  }, [draftRequested, replyTarget, requestDraft]);

  if (!replyTarget) {
    return (
      <p className="mt-4 text-xs text-cos-muted">
        No inbound message to reply to in this thread.
      </p>
    );
  }

  const isSent = replyTarget.status === "sent";
  const isApproved = replyTarget.status === "approved";
  const displayBody = isSent
    ? replyTarget.approvedBody ?? replyTarget.body
    : draftBody;

  function runAction(action: () => Promise<{ success: boolean; error?: string | null }>) {
    startTransition(async () => {
      setActionError(null);
      const result = await action();
      if (!result.success) {
        setActionError(result.error ?? "Action failed.");
      } else {
        setIsEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-4 rounded-md border border-cos-border bg-cos-card/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-cos-text">
          <InboxPlatformIcon channelType={thread.channelType} size="xs" />
          Reply
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isSent
              ? "bg-emerald-100 text-emerald-800"
              : isApproved
                ? "bg-amber-100 text-amber-900"
                : "bg-cos-bg text-cos-muted",
          )}
        >
          {statusLabel(replyTarget.status)}
        </span>
      </div>

      {replyTarget.aiDraftBody && !isSent ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-cos-muted">
          <Sparkles className="h-3 w-3 text-cos-accent" />
          AI suggested draft — review and approve before sending
        </p>
      ) : null}

      {isSent ? (
        <p className="mt-2 whitespace-pre-wrap text-sm text-cos-text">{displayBody}</p>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea
            label="Your reply"
            value={displayBody}
            onChange={(event) => {
              setDraftBody(event.target.value);
              setIsEditing(true);
            }}
            rows={4}
            disabled={isPending}
          />
        </div>
      )}

      {actionError ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {!isSent ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending}
            onClick={() => requestDraft()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={isPending || !draftBody.trim()}
            onClick={() =>
              runAction(() =>
                approveInboxReplyAction({
                  messageId: replyTarget.id,
                  body: draftBody,
                }),
              )
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            disabled={isPending || !isApproved || isEditing}
            onClick={() =>
              runAction(() => sendInboxReplyAction({ messageId: replyTarget.id }))
            }
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      ) : null}

      {!isSent && isEditing && isApproved ? (
        <p className="mt-2 text-[11px] text-cos-muted">
          You edited the reply — click Approve again before sending.
        </p>
      ) : null}
    </div>
  );
}
