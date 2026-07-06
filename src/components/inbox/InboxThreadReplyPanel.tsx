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
import { Button } from "@/components/ui/Button";
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
      return "Approved";
    case "sent":
      return "Sent";
    case "archived":
      return "Archived";
    default:
      return "Review";
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
      <div className="shrink-0 border-t border-cos-border bg-cos-card px-4 py-3">
        <p className="text-xs text-cos-muted">No inbound message to reply to in this thread.</p>
      </div>
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

  if (isSent) {
    return (
      <div className="shrink-0 border-t border-cos-border bg-cos-card px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-cos-muted">
          Sent reply
        </p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-cos-text">{displayBody}</p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t border-cos-border bg-cos-card px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cos-muted">
          {replyTarget.aiDraftBody ? (
            <Sparkles className="h-3 w-3 text-cos-accent" aria-hidden />
          ) : null}
          AI draft — approve before sending
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            isApproved
              ? "bg-cos-warning text-cos-warning-text"
              : "bg-cos-bg text-cos-muted",
          )}
        >
          {statusLabel(replyTarget.status)}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          value={displayBody}
          onChange={(event) => {
            setDraftBody(event.target.value);
            setIsEditing(true);
          }}
          rows={2}
          disabled={isPending}
          placeholder="Type a reply…"
          aria-label="Your reply"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-2xl border border-cos-border bg-cos-bg px-4 py-2.5 text-sm leading-relaxed text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none disabled:opacity-60"
        />
        <Button
          size="sm"
          disabled={isPending || !isApproved || isEditing || !draftBody.trim()}
          className="h-10 w-10 shrink-0 rounded-full p-0"
          aria-label="Send reply"
          onClick={() =>
            runAction(() => sendInboxReplyAction({ messageId: replyTarget.id }))
          }
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={isPending}
          className="h-7 px-2 text-xs"
          onClick={() => requestDraft()}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Regenerate
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={isPending || !draftBody.trim()}
          className="h-7 px-2 text-xs"
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
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Approve
        </Button>
      </div>

      {actionError ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {isEditing && isApproved ? (
        <p className="mt-1.5 text-[11px] text-cos-muted">
          You edited the reply — click Approve again before sending.
        </p>
      ) : null}
    </div>
  );
}
