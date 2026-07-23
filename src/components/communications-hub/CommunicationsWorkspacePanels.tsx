"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Check,
  Heart,
  Loader2,
  Paperclip,
  Plus,
  Smile,
  Sparkles,
  Sticker,
  ThumbsUp,
  X,
} from "lucide-react";
import { Theme, type EmojiClickData } from "emoji-picker-react";
import {
  approveInboxReplyAction,
  deleteOrganizationStickerAction,
  generateInboxAiDraftAction,
  listOrganizationStickersAction,
  sendInboxReplyAction,
  uploadOrganizationStickerAction,
} from "@/lib/inbox/actions";
import { CommunicationsParentPostCard } from "@/components/communications-hub/CommunicationsParentPostCard";
import { GiphyGifPicker } from "@/components/communications-hub/GiphyGifPicker";
import { hasCommentPostPreview } from "@/lib/inbox/comment-post-preview";
import { isCommentChannel, isDmChannel } from "@/lib/inbox/constants";
import { deriveAiConfidenceScore } from "@/lib/inbox/queue-utils";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import { getJumboEmojiCount } from "@/lib/inbox/jumbo-emoji";
import { INBOX_STICKER_PACK } from "@/lib/inbox/stickers";
import type { GiphyGifSummary } from "@/lib/giphy/types";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import type { OrganizationSticker } from "@/types/organization-stickers";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] w-[320px] items-center justify-center rounded-xl border border-cos-border bg-white text-xs text-cos-muted">
      Loading emoji…
    </div>
  ),
});

type ComposerPicker = "emoji" | "sticker" | "gif" | null;

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
  const [composerPicker, setComposerPicker] = useState<ComposerPicker>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [orgStickers, setOrgStickers] = useState<OrganizationSticker[]>([]);
  const [stickersLoading, setStickersLoading] = useState(false);
  const [stickerUploading, setStickerUploading] = useState(false);
  const [pendingSticker, setPendingSticker] = useState<OrganizationSticker | null>(
    null,
  );
  const [pendingGif, setPendingGif] = useState<GiphyGifSummary | null>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerUploadInputRef = useRef<HTMLInputElement>(null);
  const composerPickerRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const commentThread = isCommentChannel(thread.channelType);
  const dmThread = isDmChannel(thread.channelType);

  const participantFirstName =
    thread.participantName?.trim().split(/\s+/)[0] ?? "contact";

  const rememberSelection = useCallback(() => {
    const textarea = replyTextareaRef.current;
    if (!textarea) {
      return;
    }
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    };
  }, []);

  useEffect(() => {
    setDraftBody(initialBody);
    setManualReply("");
    setIsEditing(false);
    setActionError(null);
    setAttachmentNotice(null);
    setDraftRequested(false);
    setComposerPicker(null);
    setPendingSticker(null);
    setPendingGif(null);
    selectionRef.current = { start: 0, end: 0 };
  }, [replyTarget?.id, initialBody, replyTarget?.status]);

  const loadOrgStickers = useCallback(async () => {
    setStickersLoading(true);
    const result = await listOrganizationStickersAction();
    setStickersLoading(false);
    if (result.success) {
      setOrgStickers(result.stickers);
      return;
    }
    setAttachmentNotice(result.error ?? "Could not load stickers.");
  }, []);

  useEffect(() => {
    if (composerPicker !== "sticker") {
      return;
    }
    void loadOrgStickers();
  }, [composerPicker, loadOrgStickers]);

  useEffect(() => {
    if (!composerPicker) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        composerPickerRef.current &&
        !composerPickerRef.current.contains(event.target as Node)
      ) {
        setComposerPicker(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setComposerPicker(null);
      }
    }

    // Defer so the opening click does not immediately close the picker.
    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [composerPicker]);

  const insertIntoReply = useCallback((text: string) => {
    const textarea = replyTextareaRef.current;
    const isFocused =
      textarea != null && document.activeElement === textarea;

    setManualReply((current) => {
      let insertAt = Math.min(selectionRef.current.start, current.length);
      let insertEnd = Math.min(selectionRef.current.end, current.length);
      // If the composer was never focused, append instead of inserting at 0.
      if (!isFocused && insertAt === 0 && insertEnd === 0 && current.length > 0) {
        insertAt = current.length;
        insertEnd = current.length;
      }
      const next = `${current.slice(0, insertAt)}${text}${current.slice(insertEnd)}`;
      const cursor = insertAt + text.length;
      selectionRef.current = { start: cursor, end: cursor };
      return next;
    });

    requestAnimationFrame(() => {
      if (!textarea) {
        return;
      }
      textarea.focus();
      const cursor = selectionRef.current.start;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, []);

  function handleAttachClick() {
    setAttachmentNotice(null);
    setComposerPicker(null);
    fileInputRef.current?.click();
  }

  function handleEmojiClick(emojiData: EmojiClickData) {
    insertIntoReply(emojiData.emoji);
  }

  function handleQuickEmojiStickerSelect(emoji: string) {
    insertIntoReply(emoji);
    setComposerPicker(null);
    setAttachmentNotice(null);
  }

  function handleCustomStickerSelect(sticker: OrganizationSticker) {
    if (commentThread) {
      setAttachmentNotice(
        "Image stickers can’t be sent as comment replies — Meta only accepts text on comments. Use Messenger or Instagram DMs.",
      );
      setComposerPicker(null);
      return;
    }
    setPendingSticker(sticker);
    setPendingGif(null);
    setComposerPicker(null);
    setAttachmentNotice(
      "Sticker attached — Send will deliver it as an image in this DM.",
    );
  }

  function handleGifSelect(gif: GiphyGifSummary) {
    if (!dmThread) {
      setAttachmentNotice(
        "GIFs can only be sent in Messenger or Instagram DMs — comments and tags stay text-only.",
      );
      setComposerPicker(null);
      return;
    }
    setPendingGif(gif);
    setPendingSticker(null);
    setComposerPicker(null);
    setAttachmentNotice(
      "GIF attached — Send will deliver it as an image in this DM.",
    );
  }

  function handleGifButtonClick() {
    if (!dmThread) {
      setAttachmentNotice(
        "GIFs are available in Messenger and Instagram DMs only — comments and tags stay text-only.",
      );
      setComposerPicker(null);
      return;
    }
    setComposerPicker((current) => (current === "gif" ? null : "gif"));
  }

  function handleAttachSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    // Allow selecting the same file again later.
    event.target.value = "";
    if (!file) {
      return;
    }
    setAttachmentNotice(
      "Attachments aren't supported for Meta replies yet — send text only for now. Use Stickers to upload reusable images for DMs.",
    );
  }

  function handleStickerUploadSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) {
      return;
    }

    setStickerUploading(true);
    setAttachmentNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadOrganizationStickerAction(formData);
      setStickerUploading(false);
      if (!result.success || !result.sticker) {
        setAttachmentNotice(result.error ?? "Could not upload sticker.");
        return;
      }
      setOrgStickers((current) => [result.sticker!, ...current]);
      setAttachmentNotice(`Added “${result.sticker.label}” to your sticker pack.`);
    });
  }

  function handleDeleteOrgSticker(stickerId: string) {
    startTransition(async () => {
      const result = await deleteOrganizationStickerAction({ stickerId });
      if (!result.success) {
        setAttachmentNotice(result.error ?? "Could not delete sticker.");
        return;
      }
      setOrgStickers((current) => current.filter((item) => item.id !== stickerId));
      setPendingSticker((current) =>
        current?.id === stickerId ? null : current,
      );
    });
  }

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
  const canSend =
    (Boolean(sendBody.trim()) ||
      pendingSticker != null ||
      pendingGif != null) &&
    !isPending;
  const composerJumboCount = getJumboEmojiCount(manualReply);

  function handleApproveAndSend() {
    if (!replyTarget) {
      return;
    }

    startTransition(async () => {
      setActionError(null);

      const bodyToSend = sendBody.trim();
      const hasImageAttachment = pendingSticker != null || pendingGif != null;
      if (!bodyToSend && !hasImageAttachment) {
        setActionError("Write a reply or choose a sticker or GIF before sending.");
        return;
      }

      if (pendingSticker && commentThread) {
        setActionError(
          "Image stickers can’t be sent as comment replies — Meta only accepts text on comments.",
        );
        return;
      }

      if (pendingGif && !dmThread) {
        setActionError(
          "GIFs can only be sent in Messenger or Instagram DMs — comments and tags stay text-only.",
        );
        return;
      }

      // Sticker/GIF-only DM replies can skip text approval.
      const needsTextApproval =
        Boolean(bodyToSend) &&
        !isSent &&
        (!isApproved || isEditing || bodyToSend !== (replyTarget.approvedBody ?? ""));

      if (needsTextApproval) {
        const approveResult = await approveInboxReplyAction({
          messageId: replyTarget.id,
          body: bodyToSend,
        });
        if (!approveResult.success) {
          setActionError(approveResult.error ?? "Could not approve reply.");
          return;
        }
      }

      const sendResult = await sendInboxReplyAction({
        messageId: replyTarget.id,
        body:
          isSent || hasImageAttachment ? bodyToSend || undefined : undefined,
        stickerId: pendingSticker?.id ?? null,
        giphyImageUrl: pendingGif?.sendUrl ?? null,
      });
      if (!sendResult.success) {
        setActionError(sendResult.error ?? "Could not send reply.");
        return;
      }

      setIsEditing(false);
      setManualReply("");
      setPendingSticker(null);
      setPendingGif(null);
      setAttachmentNotice(null);
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

      <div className="relative z-30 mt-4 overflow-visible rounded-xl border border-cos-border bg-cos-card px-4 py-3">
        {pendingSticker ? (
          <div className="relative mb-3 inline-block">
            <img
              src={pendingSticker.publicUrl}
              alt=""
              className="w-[180px] rounded-xl object-contain bg-white"
            />
            <button
              type="button"
              onClick={() => {
                setPendingSticker(null);
                setAttachmentNotice(null);
              }}
              className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:bg-white hover:text-cos-text"
              aria-label="Remove sticker"
              title="Remove sticker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        {pendingGif ? (
          <div className="relative mb-3 inline-block">
            <img
              src={pendingGif.previewUrl}
              alt=""
              className="w-[180px] rounded-xl object-cover bg-white"
            />
            <button
              type="button"
              onClick={() => {
                setPendingGif(null);
                setAttachmentNotice(null);
              }}
              className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-cos-border bg-cos-card text-cos-muted shadow-sm transition-colors hover:bg-white hover:text-cos-text"
              aria-label="Remove GIF"
              title="Remove GIF"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
        <textarea
          ref={replyTextareaRef}
          value={manualReply}
          onChange={(event) => {
            setManualReply(event.target.value);
            rememberSelection();
          }}
          onSelect={rememberSelection}
          onClick={rememberSelection}
          onKeyUp={rememberSelection}
          onBlur={rememberSelection}
          rows={3}
          placeholder={`Reply to ${participantFirstName}...`}
          aria-label={`Reply to ${participantFirstName}`}
          className={cn(
            "w-full resize-none bg-transparent text-cos-text placeholder:text-cos-muted focus:outline-none",
            composerJumboCount === 1 && "text-[3rem] leading-none",
            composerJumboCount != null &&
              composerJumboCount > 1 &&
              "text-[2.5rem] leading-none",
            composerJumboCount == null && "text-sm leading-relaxed",
          )}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={handleAttachSelected}
          tabIndex={-1}
        />
        <input
          ref={stickerUploadInputRef}
          type="file"
          accept="image/png,image/webp,image/gif,image/jpeg"
          className="hidden"
          onChange={handleStickerUploadSelected}
          tabIndex={-1}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="relative flex items-center gap-0.5" ref={composerPickerRef}>
            <button
              type="button"
              onClick={handleAttachClick}
              onMouseDown={(event) => event.preventDefault()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
              aria-label="Attach file"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                setComposerPicker((current) => (current === "emoji" ? null : "emoji"))
              }
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text",
                composerPicker === "emoji" && "bg-cos-bg text-cos-text",
              )}
              aria-label="Add emoji"
              aria-expanded={composerPicker === "emoji"}
              aria-haspopup="dialog"
              title="Add emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() =>
                setComposerPicker((current) =>
                  current === "sticker" ? null : "sticker",
                )
              }
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text",
                composerPicker === "sticker" && "bg-cos-bg text-cos-text",
              )}
              aria-label="Add sticker"
              aria-expanded={composerPicker === "sticker"}
              aria-haspopup="dialog"
              title="Add sticker"
            >
              <Sticker className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleGifButtonClick}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text",
                !dmThread && "opacity-45",
                composerPicker === "gif" && dmThread && "bg-cos-bg text-cos-text",
              )}
              aria-label={
                dmThread
                  ? "Add GIF"
                  : "GIFs available in Messenger and Instagram DMs only"
              }
              aria-expanded={composerPicker === "gif"}
              aria-haspopup="dialog"
              title={
                dmThread
                  ? "Add GIF from GIPHY"
                  : "GIFs are available in Messenger and Instagram DMs only — comments and tags stay text-only"
              }
            >
              <span className="text-[11px] font-bold tracking-wide">GIF</span>
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertIntoReply("👍")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
              aria-label="Insert thumbs up"
              title="Insert 👍"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertIntoReply("❤️")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text"
              aria-label="Insert heart"
              title="Insert ❤️"
            >
              <Heart className="h-4 w-4" />
            </button>
            {composerPicker === "emoji" ? (
              <div
                className="absolute bottom-full left-0 z-50 mb-2 overflow-hidden rounded-xl border border-cos-border bg-white shadow-lg"
                role="dialog"
                aria-label="Emoji picker"
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.LIGHT}
                  width={320}
                  height={360}
                  searchPlaceHolder="Search emoji"
                  previewConfig={{ showPreview: false }}
                  lazyLoadEmojis
                />
              </div>
            ) : null}
            {composerPicker === "sticker" ? (
              <div
                className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-xl border border-cos-border bg-white p-3 shadow-lg"
                role="dialog"
                aria-label="Sticker picker"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-wide text-cos-muted uppercase">
                    Your stickers
                  </p>
                  <button
                    type="button"
                    disabled={stickerUploading || isPending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => stickerUploadInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-full border border-cos-border bg-white px-2 py-0.5 text-[11px] font-medium text-cos-text transition-colors hover:border-cos-dark disabled:opacity-50"
                  >
                    {stickerUploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                    Add
                  </button>
                </div>
                <p className="mb-2 text-[11px] leading-snug text-cos-muted">
                  Upload PNG, WebP, GIF, or JPEG (max 2 MB).{" "}
                  {commentThread
                    ? "Sending images works in DMs only — comments stay text-only."
                    : "Selecting one attaches it to this DM reply."}
                </p>
                {stickersLoading ? (
                  <div className="flex h-24 items-center justify-center text-xs text-cos-muted">
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Loading stickers…
                  </div>
                ) : orgStickers.length === 0 ? (
                  <button
                    type="button"
                    disabled={stickerUploading || isPending}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => stickerUploadInputRef.current?.click()}
                    className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-cos-border text-xs text-cos-muted transition-colors hover:border-cos-dark hover:text-cos-text"
                  >
                    <Plus className="h-4 w-4" />
                    Upload your first sticker
                  </button>
                ) : (
                  <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
                    {orgStickers.map((sticker) => (
                      <div key={sticker.id} className="group relative">
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleCustomStickerSelect(sticker)}
                          className={cn(
                            "flex h-14 w-full items-center justify-center overflow-hidden rounded-lg border border-transparent bg-cos-bg/50 transition-colors hover:border-cos-border hover:bg-cos-bg",
                            pendingSticker?.id === sticker.id &&
                              "border-cos-dark ring-1 ring-cos-dark",
                          )}
                          aria-label={sticker.label}
                          title={sticker.label}
                        >
                          <img
                            src={sticker.publicUrl}
                            alt=""
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                          />
                        </button>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleDeleteOrgSticker(sticker.id)}
                          className="absolute -top-1 -right-1 hidden h-5 w-5 items-center justify-center rounded-full border border-cos-border bg-white text-cos-muted shadow-sm group-hover:inline-flex hover:text-red-600"
                          aria-label={`Delete ${sticker.label}`}
                          title="Delete sticker"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3 border-t border-cos-border pt-2">
                  <p className="mb-1.5 text-[11px] font-medium tracking-wide text-cos-muted uppercase">
                    Quick emoji
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {INBOX_STICKER_PACK.map((sticker) => (
                      <button
                        key={sticker.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleQuickEmojiStickerSelect(sticker.emoji)}
                        className="inline-flex h-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-cos-bg"
                        aria-label={sticker.label}
                        title={sticker.label}
                      >
                        {sticker.emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            {composerPicker === "gif" && dmThread ? (
              <div className="absolute bottom-full left-0 z-50 mb-2 overflow-visible">
                <GiphyGifPicker onSelect={handleGifSelect} />
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

      {attachmentNotice ? (
        <p className="mt-3 text-xs text-amber-700" role="status">
          {attachmentNotice}
        </p>
      ) : null}

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
