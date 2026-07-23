"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Paperclip,
  Smile,
  Sparkles,
} from "lucide-react";
import {
  approveInboxReplyAction,
  generateInboxAiDraftAction,
  sendInboxReplyAction,
} from "@/lib/inbox/actions";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface InboxThreadReplyPanelProps {
  thread: InboxThread;
  messages: InboxMessage[];
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function renderTextWithLinks(text: string) {
  const parts = text.split(URL_PATTERN);
  return parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#1a6b4a] underline decoration-[#1a6b4a]/30 underline-offset-2 hover:decoration-[#1a6b4a]"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

export function InboxThreadReplyPanel({ thread, messages }: InboxThreadReplyPanelProps) {
  const router = useRouter();
  const replyTarget = useMemo(
    () =>
      resolveInboxReplyTarget({
        channelType: thread.channelType,
        messages,
      }),
    [messages, thread.channelType],
  );

  const initialBody =
    replyTarget?.status === "approved" && replyTarget.approvedBody
      ? replyTarget.approvedBody
      : replyTarget?.aiDraftBody ?? replyTarget?.approvedBody ?? "";

  const [draftBody, setDraftBody] = useState(initialBody);
  const [manualReply, setManualReply] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftRequested, setDraftRequested] = useState(false);

  const participantFirstName =
    thread.participantName?.trim().split(/\s+/)[0] ?? "contact";

  useEffect(() => {
    setDraftBody(initialBody);
    setManualReply("");
    setIsEditing(false);
    setActionError(null);
    setDraftRequested(false);
  }, [replyTarget?.id, initialBody]);

  const requestDraft = useCallback(
    (options?: { forceRegenerate?: boolean }) => {
      if (!replyTarget) {
        return;
      }

      startTransition(async () => {
        setActionError(null);
        if (options?.forceRegenerate) {
          setDraftBody("");
          setIsEditing(false);
        }

        const result = await generateInboxAiDraftAction({
          threadId: thread.id,
          messageId: replyTarget.id,
          forceRegenerate: options?.forceRegenerate,
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
    },
    [replyTarget, router, thread.id],
  );

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
      <div className="shrink-0 border-t border-[#ebebea] bg-white px-6 py-4">
        <p className="text-sm text-[#8a8a88]">
          {messages.length === 0
            ? "No messages in this thread yet."
            : "No inbound message to reply to in this thread."}
        </p>
      </div>
    );
  }

  const isSent = replyTarget.status === "sent";
  const isApproved = replyTarget.status === "approved";
  const displayBody = isSent
    ? replyTarget.approvedBody ?? replyTarget.body
    : draftBody;
  const draftTimestamp = replyTarget.aiDraftGeneratedAt ?? replyTarget.sentAt;
  const sendBody = manualReply.trim() || displayBody;

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

  function handleApproveAndSend() {
    if (!replyTarget) {
      return;
    }

    startTransition(async () => {
      setActionError(null);

      const bodyToSend = sendBody;
      if (!bodyToSend.trim()) {
        setActionError("Write a reply before sending.");
        return;
      }

      if (!isApproved || isEditing || bodyToSend !== (replyTarget.approvedBody ?? "")) {
        const approveResult = await approveInboxReplyAction({
          messageId: replyTarget.id,
          body: bodyToSend,
        });
        if (!approveResult.success) {
          setActionError(approveResult.error ?? "Could not approve reply.");
          return;
        }
      }

      const sendResult = await sendInboxReplyAction({ messageId: replyTarget.id });
      if (!sendResult.success) {
        setActionError(sendResult.error ?? "Could not send reply.");
        return;
      }

      setIsEditing(false);
      setManualReply("");
      router.refresh();
    });
  }

  if (isSent) {
    return (
      <div className="shrink-0 border-t border-[#ebebea] bg-white px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8a8a88]">
          Sent reply
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1a1a1a]">
          {displayBody}
        </p>
      </div>
    );
  }

  const canSend = Boolean(sendBody.trim()) && !isPending;

  return (
    <div className="shrink-0 border-t border-[#ebebea] bg-white px-6 py-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 fill-[#f5c842] text-[#f5c842]" aria-hidden />
        <p className="text-sm font-semibold text-[#1a1a1a]">AI suggested reply</p>
        {isPending && !displayBody ? (
          <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-[#8a8a88]" />
        ) : null}
      </div>

      {displayBody ? (
        <div className="max-w-[85%]">
          {isEditing ? (
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={4}
              disabled={isPending}
              aria-label="Edit AI suggested reply"
              className="w-full resize-none rounded-[1.25rem] rounded-bl-md bg-[#e8f3ec] px-4 py-3 text-sm leading-relaxed text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]/20 disabled:opacity-60"
            />
          ) : (
            <div className="rounded-[1.25rem] rounded-bl-md bg-[#e8f3ec] px-4 py-3 text-sm leading-relaxed text-[#1a1a1a]">
              <p className="whitespace-pre-wrap">
                {renderTextWithLinks(displayBody)}
              </p>
            </div>
          )}
          {draftTimestamp ? (
            <time
              className="mt-1.5 block px-1 text-xs text-[#8a8a88]"
              dateTime={draftTimestamp}
            >
              {formatMessageTime(draftTimestamp)}
            </time>
          ) : null}
        </div>
      ) : isPending ? (
        <p className="text-sm text-[#8a8a88]">Generating a suggested reply…</p>
      ) : (
        <p className="text-sm text-[#8a8a88]">
          No suggested reply yet. Click Ask AI to generate one.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending || !canSend}
          onClick={handleApproveAndSend}
          className="inline-flex h-9 items-center justify-center rounded-full bg-[#1a1a1a] px-5 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:bg-[#d4d4d2] disabled:text-[#8a8a88]"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & send"}
        </button>
        <button
          type="button"
          disabled={isPending || !displayBody}
          onClick={() => setIsEditing(true)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d8d8d6] bg-white px-5 text-sm font-medium text-[#1a1a1a] transition-colors hover:border-[#b8b8b6] disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => requestDraft({ forceRegenerate: true })}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#d8d8d6] bg-white px-5 text-sm font-medium text-[#1a1a1a] transition-colors hover:border-[#b8b8b6] disabled:opacity-50"
        >
          Ask AI
        </button>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-[#e3e3e1] bg-[#fafaf9] px-4 py-3">
        <textarea
          value={manualReply}
          onChange={(event) => setManualReply(event.target.value)}
          rows={3}
          disabled={isPending}
          placeholder={`Reply to ${participantFirstName}...`}
          aria-label={`Reply to ${participantFirstName}`}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-[#1a1a1a] placeholder:text-[#a8a8a6] focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a8a88] transition-colors hover:bg-[#efefed] hover:text-[#1a1a1a]"
            aria-label="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8a8a88] transition-colors hover:bg-[#efefed] hover:text-[#1a1a1a]"
            aria-label="Add emoji"
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleApproveAndSend}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors",
              canSend
                ? "bg-[#1a1a1a] text-white hover:bg-[#2a2a2a]"
                : "bg-[#efefed] text-[#a8a8a6]",
            )}
          >
            Send
          </button>
        </div>
      </div>

      {actionError ? (
        <p className="mt-3 text-xs text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}

      {isEditing && isApproved ? (
        <p className="mt-2 text-xs text-[#8a8a88]">
          You edited the reply — approve again before sending.
        </p>
      ) : null}
    </div>
  );
}
