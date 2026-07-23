"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Heart,
  Loader2,
  Paperclip,
  Smile,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import {
  approveInboxReplyAction,
  generateInboxAiDraftAction,
  sendInboxReplyAction,
} from "@/lib/inbox/actions";
import { CommunicationsParentPostCard } from "@/components/communications-hub/CommunicationsParentPostCard";
import { hasCommentPostPreview } from "@/lib/inbox/comment-post-preview";
import { deriveAiConfidenceScore } from "@/lib/inbox/queue-utils";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const QUICK_EMOJIS = [
  "😀",
  "😊",
  "😂",
  "😍",
  "🙏",
  "👏",
  "🎉",
  "👍",
  "❤️",
  "🙌",
  "💯",
  "✨",
] as const;

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

interface CommunicationsReplySectionProps {
  thread: InboxThread;
  messages: InboxMessage[];
}

export function CommunicationsReplySection({
  thread,
  messages,
}: CommunicationsReplySectionProps) {
  const router = useRouter();
  const replyTarget = useMemo(
    () =>
      resolveInboxReplyTarget({
        channelType: thread.channelType,
        messages,
      }),
    [messages, thread.channelType],
  );

  // After a reply is sent, start empty so Completed threads can take a follow-up.
  const initialBody =
    replyTarget?.status === "sent"
      ? ""
      : replyTarget?.status === "approved" && replyTarget.approvedBody
        ? replyTarget.approvedBody
        : replyTarget?.aiDraftBody ?? replyTarget?.approvedBody ?? "";

  const [draftBody, setDraftBody] = useState(initialBody);
  const [manualReply, setManualReply] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [draftRequested, setDraftRequested] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const participantFirstName =
    thread.participantName?.trim().split(/\s+/)[0] ?? "contact";

  useEffect(() => {
    setDraftBody(initialBody);
    setManualReply("");
    setIsEditing(false);
    setActionError(null);
    setDraftRequested(false);
    setEmojiPickerOpen(false);
  }, [replyTarget?.id, initialBody, replyTarget?.status]);

  useEffect(() => {
    if (!emojiPickerOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setEmojiPickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [emojiPickerOpen]);

  const insertIntoReply = useCallback((text: string) => {
    const textarea = replyTextareaRef.current;
    const start = textarea?.selectionStart ?? null;
    const end = textarea?.selectionEnd ?? null;

    setManualReply((current) => {
      const insertAt = start ?? current.length;
      const insertEnd = end ?? current.length;
      return `${current.slice(0, insertAt)}${text}${current.slice(insertEnd)}`;
    });

    requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }
      textarea.focus();
      const cursor = (start ?? textarea.value.length) + text.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, []);

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
      <div className="border-t border-cos-border px-5 py-4">
        <p className="text-sm text-cos-muted">
          {messages.length === 0
            ? "No messages in this thread yet."
            : "No inbound message to reply to in this thread."}
        </p>
      </div>
    );
  }

  const isSent = replyTarget.status === "sent";
  const isApproved = replyTarget.status === "approved";
  const displayBody = draftBody;
  const confidence = deriveAiConfidenceScore(replyTarget.aiSourceUsed);
  const confidenceLabel =
    confidence == null
      ? null
      : confidence >= 85
        ? "High confidence"
        : confidence >= 60
          ? "Medium confidence"
          : "Low confidence";
  const sourceLabels =
    replyTarget.aiSourceUsed?.sourcesChecked
      .filter((source) => source.answerFound)
      .map((source) => source.label) ??
    (replyTarget.aiSourceUsed?.answerFrom
      ? [replyTarget.aiSourceUsed.answerFrom.label]
      : []);
  const sendBody = manualReply.trim() || displayBody;
  const canSend = Boolean(sendBody.trim()) && !isPending;

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

  return (
    <div className="border-t border-cos-border px-5 py-5">
      <div className="rounded-xl border border-[#b8dcc4] bg-[#f4fbf6] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 fill-[#f5c842] text-[#f5c842]" aria-hidden />
          <p className="text-sm font-semibold text-cos-text">
            {isSent ? "Write another reply" : "AI Suggested Reply"}
          </p>
          {displayBody && confidenceLabel && confidence != null ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                confidence >= 85
                  ? "bg-[#e8f5ec] text-[#1a6b4a]"
                  : confidence >= 60
                    ? "bg-[#fff4e5] text-[#b45309]"
                    : "bg-[#fef2f2] text-[#b91c1c]",
              )}
            >
              {confidenceLabel}
            </span>
          ) : null}
          {isPending && !displayBody ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-cos-muted" />
          ) : null}
        </div>

        {displayBody ? (
          isEditing ? (
            <textarea
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              rows={5}
              disabled={isPending}
              aria-label="Edit AI suggested reply"
              className="w-full resize-none rounded-lg border border-[#b8dcc4] bg-white px-3 py-2 text-sm leading-relaxed text-cos-text focus:outline-none focus:ring-2 focus:ring-[#1a6b4a]/20 disabled:opacity-60"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-cos-text">
              {renderTextWithLinks(displayBody)}
            </p>
          )
        ) : isPending ? (
          <p className="text-sm text-cos-muted">Generating a suggested reply…</p>
        ) : (
          <p className="text-sm text-cos-muted">
            No suggested reply yet. Click Ask AI to generate one.
          </p>
        )}

        {sourceLabels.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-cos-muted">AI found this answer in:</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sourceLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-[#b8dcc4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#1a6b4a]"
                >
                  <Check className="h-3 w-3" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isPending || !canSend}
            onClick={handleApproveAndSend}
            className="inline-flex h-9 items-center justify-center rounded-full bg-cos-dark px-5 text-sm font-medium text-[#f6f2eb] transition-colors hover:bg-cos-text disabled:cursor-not-allowed disabled:bg-cos-border disabled:text-cos-muted"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve & Send"}
          </button>
          <button
            type="button"
            disabled={isPending || !displayBody}
            onClick={() => setIsEditing(true)}
            className="inline-flex h-9 items-center justify-center rounded-full border border-cos-border bg-white px-5 text-sm font-medium text-cos-text transition-colors hover:border-cos-dark disabled:opacity-50"
          >
            Edit Reply
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => requestDraft({ forceRegenerate: true })}
            className="inline-flex h-9 items-center justify-center rounded-full border border-cos-border bg-white px-5 text-sm font-medium text-cos-text transition-colors hover:border-cos-dark disabled:opacity-50"
          >
            Ask AI
          </button>
          <button
            type="button"
            disabled
            title="Alternative draft options coming soon"
            className="inline-flex h-9 items-center justify-center rounded-full border border-cos-border bg-white px-5 text-sm font-medium text-cos-muted opacity-60"
          >
            See Other Options
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cos-border bg-cos-card px-4 py-3">
        <textarea
          ref={replyTextareaRef}
          value={manualReply}
          onChange={(event) => setManualReply(event.target.value)}
          rows={3}
          disabled={isPending}
          placeholder={`Reply to ${participantFirstName}...`}
          aria-label={`Reply to ${participantFirstName}`}
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-cos-text placeholder:text-cos-muted focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="relative flex items-center gap-0.5" ref={emojiPickerRef}>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted opacity-60"
              aria-label="Attach file"
              title="Attachments not supported yet — Meta replies are text-only"
              disabled
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setEmojiPickerOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text disabled:opacity-50"
              aria-label="Add emoji"
              aria-expanded={emojiPickerOpen}
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => insertIntoReply("👍")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text disabled:opacity-50"
              aria-label="Insert thumbs up"
              title="Insert 👍"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => insertIntoReply("❤️")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text disabled:opacity-50"
              aria-label="Insert heart"
              title="Insert ❤️"
            >
              <Heart className="h-4 w-4" />
            </button>
            {emojiPickerOpen ? (
              <div
                className="absolute bottom-full left-0 z-20 mb-2 grid w-52 grid-cols-6 gap-1 rounded-xl border border-cos-border bg-white p-2 shadow-lg"
                role="listbox"
                aria-label="Emoji picker"
              >
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    role="option"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors hover:bg-cos-bg"
                    onClick={() => {
                      insertIntoReply(emoji);
                      setEmojiPickerOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            disabled={!canSend}
            onClick={handleApproveAndSend}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors",
              canSend
                ? "bg-cos-dark text-[#f6f2eb] hover:bg-cos-text"
                : "bg-cos-bg text-cos-muted",
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
        <p className="mt-2 text-xs text-cos-muted">
          You edited the reply — approve again before sending.
        </p>
      ) : null}

      {replyTarget.sentAt ? (
        <time className="mt-2 block text-xs text-cos-muted" dateTime={replyTarget.sentAt}>
          {formatMessageTime(replyTarget.sentAt)}
        </time>
      ) : null}
    </div>
  );
}

interface CommunicationsAiPanelProps {
  thread: InboxThread;
  messages: InboxMessage[];
  pageName?: string | null;
  className?: string;
}

export function CommunicationsAiPanel({
  thread,
  messages,
  pageName = null,
  className,
}: CommunicationsAiPanelProps) {
  const replyTarget = useMemo(
    () =>
      resolveInboxReplyTarget({
        channelType: thread.channelType,
        messages,
      }),
    [messages, thread.channelType],
  );

  const confidence = deriveAiConfidenceScore(replyTarget?.aiSourceUsed ?? null);
  const sourcesChecked = replyTarget?.aiSourceUsed?.sourcesChecked ?? [];
  const showParentPost = hasCommentPostPreview(thread);
  const conversationContext =
    replyTarget?.body?.trim() ||
    thread.lastMessageSnippet?.trim() ||
    "Select a conversation to see context.";
  const showConfidence = confidence != null;
  const showSources = sourcesChecked.length > 0;

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-cos-border bg-cos-card lg:w-[18rem] lg:max-w-[20rem] lg:border-l",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <section className="space-y-4">
          {showParentPost ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
                Original Post
              </h3>
              <div className="mt-2">
                <CommunicationsParentPostCard thread={thread} pageName={pageName} />
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
                Conversation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-cos-text">
                {conversationContext.length > 160
                  ? `${conversationContext.slice(0, 157)}…`
                  : conversationContext}
              </p>
            </div>
          )}

          {showConfidence ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
                  Confidence
                </h3>
                <span className="text-sm font-semibold text-[#1a6b4a] tabular-nums">
                  {confidence}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-cos-bg">
                <div
                  className="h-full rounded-full bg-[#1a6b4a] transition-all"
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          ) : null}

          {showSources ? (
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-cos-muted uppercase">
                Sources Searched
              </h3>
              <ul className="mt-2 space-y-1.5" role="list">
                {sourcesChecked.map((source) => (
                  <li
                    key={`${source.label}-${source.url}`}
                    className="flex items-start gap-2 text-xs text-cos-text"
                  >
                    <Check
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        source.answerFound ? "text-[#1a6b4a]" : "text-cos-border",
                      )}
                      aria-hidden
                    />
                    <span className={source.answerFound ? "" : "text-cos-muted"}>
                      {source.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
