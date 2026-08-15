"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { Reply, Smile } from "lucide-react";
import { isCommentChannel } from "@/lib/inbox/constants";
import { setInboxMessageReactionAction } from "@/lib/inbox/actions";
import { getJumboEmojiCount } from "@/lib/inbox/jumbo-emoji";
import { readQuotedMessagePreview } from "@/lib/inbox/message-quote";
import {
  BUBBLE_QUICK_REACTIONS,
  readLocalMessageReaction,
  readLocalReactionOnly,
  readMessageStickerUrl,
  readMetaReactionMappedToLike,
  type BubbleQuickReaction,
} from "@/lib/inbox/stickers";
import type { InboxMessage } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import { InboxParticipantAvatar } from "@/components/inbox/InboxParticipantAvatar";

const DOUBLE_TAP_MS = 320;
const IMAGE_PLACEHOLDER_BODIES = new Set(["📎 Sticker", "📎 GIF"]);
const REACTION_PICKER_EST_HEIGHT = 72;
const REACTION_PICKER_EST_WIDTH = 120;

type ReactionPickerCoords = {
  top: number;
  left: number;
  openUp: boolean;
};

interface MessageBubbleProps {
  message: InboxMessage;
  isOutbound: boolean;
  avatarUrl: string | null;
  avatarName: string | null;
  /** When set, shows a reply hover action that quotes this message in the composer. */
  onReplyToMessage?: (message: InboxMessage) => void;
}

export function MessageBubble({
  message,
  isOutbound,
  avatarUrl,
  avatarName,
  onReplyToMessage,
}: MessageBubbleProps) {
  const [reaction, setReaction] = useState<BubbleQuickReaction | null>(() =>
    readLocalMessageReaction(message.metadata),
  );
  const [mappedToLike, setMappedToLike] = useState(() =>
    readMetaReactionMappedToLike(message.metadata),
  );
  const [localOnly, setLocalOnly] = useState(() =>
    readLocalReactionOnly(message.metadata),
  );
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [reactionWarning, setReactionWarning] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCoords, setPickerCoords] = useState<ReactionPickerCoords | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const lastTapRef = useRef(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const stickerUrl = readMessageStickerUrl(message.metadata);
  const textBody = message.body?.trim() ?? "";
  const showTextBody =
    Boolean(textBody) &&
    !(stickerUrl && IMAGE_PLACEHOLDER_BODIES.has(textBody));
  // Image stickers stay images; jumbo only applies to emoji-only text bodies.
  const jumboEmojiCount =
    showTextBody && !stickerUrl ? getJumboEmojiCount(textBody) : null;
  const commentsLikeOnly = isCommentChannel(message.channelType);
  const showHoverReply = Boolean(onReplyToMessage);
  const quotedPreview = readQuotedMessagePreview(message.metadata);

  useEffect(() => {
    setReaction(readLocalMessageReaction(message.metadata));
    setMappedToLike(readMetaReactionMappedToLike(message.metadata));
    setLocalOnly(readLocalReactionOnly(message.metadata));
  }, [message.id, message.metadata]);

  useLayoutEffect(() => {
    if (!pickerOpen || !bubbleRef.current) {
      setPickerCoords(null);
      return;
    }

    function place() {
      const rect = bubbleRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const spaceAbove = rect.top;
      const openUp =
        spaceAbove >= REACTION_PICKER_EST_HEIGHT + 12 ||
        spaceAbove > window.innerHeight - rect.bottom;

      let left = isOutbound
        ? rect.right - REACTION_PICKER_EST_WIDTH
        : rect.left;
      left = Math.min(
        Math.max(8, left),
        window.innerWidth - REACTION_PICKER_EST_WIDTH - 8,
      );

      setPickerCoords({
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        left,
        openUp,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [pickerOpen, isOutbound]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node;
      if (pickerRef.current?.contains(target)) {
        return;
      }
      if (actionsRef.current?.contains(target)) {
        return;
      }
      setPickerOpen(false);
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setPickerOpen(false);
      }
    }

    const timer = window.setTimeout(() => {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pickerOpen]);

  const openPicker = useCallback(() => {
    setPickerOpen(true);
    setReactionError(null);
  }, []);

  const applyReaction = useCallback(
    (next: BubbleQuickReaction) => {
      const previous = reaction;
      const previousMapped = mappedToLike;
      const previousLocalOnly = localOnly;
      // Toggle off when selecting the same reaction again.
      const resolved = previous === next ? null : next;
      setReaction(resolved);
      setPickerOpen(false);
      setReactionError(null);
      setReactionWarning(null);
      if (resolved && commentsLikeOnly) {
        setMappedToLike(true);
      } else if (!resolved) {
        setMappedToLike(false);
        setLocalOnly(false);
      }

      startTransition(async () => {
        const result = await setInboxMessageReactionAction({
          messageId: message.id,
          reaction: resolved,
        });
        if (!result.success) {
          setReaction(previous);
          setMappedToLike(previousMapped);
          setLocalOnly(previousLocalOnly);
          setReactionError(result.error ?? "Could not apply reaction.");
          return;
        }
        if (result.warning) {
          setReactionWarning(result.warning);
          setMappedToLike(result.warning.includes("Like"));
          setLocalOnly(result.warning.includes("Hey Ralli"));
        } else {
          setReactionWarning(null);
          setMappedToLike(Boolean(resolved && commentsLikeOnly));
          setLocalOnly(false);
        }
      });
    },
    [commentsLikeOnly, localOnly, mappedToLike, message.id, reaction],
  );

  function handleDoubleActivate() {
    openPicker();
  }

  function handleDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    handleDoubleActivate();
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    const now = Date.now();
    if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
      event.preventDefault();
      lastTapRef.current = 0;
      handleDoubleActivate();
      return;
    }
    lastTapRef.current = now;
  }

  return (
    <li
      className={cn(
        "flex w-fit min-w-0 max-w-[min(85%,100%)] items-end gap-2 overflow-visible",
        isOutbound && "ml-auto flex-row-reverse",
      )}
    >
      <InboxParticipantAvatar
        avatarUrl={avatarUrl}
        name={avatarName}
        className="h-8 w-8 text-[10px]"
        showUserIconFallback
      />
      <div className="relative min-w-0 max-w-full overflow-visible">
        <div
          ref={bubbleRef}
          className={cn(
            "group/bubble relative w-fit max-w-full overflow-visible",
            reaction && "pb-3",
          )}
        >
          <div
            role="button"
            tabIndex={0}
            onDoubleClick={handleDoubleClick}
            onTouchEnd={handleTouchEnd}
            onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openPicker();
              }
            }}
            aria-label={`Message from ${avatarName ?? "contact"}. Double-tap to react.`}
            className={cn(
              "max-w-full select-none rounded-2xl touch-manipulation",
              jumboEmojiCount
                ? "px-3 py-2"
                : stickerUrl && !showTextBody && !quotedPreview
                  ? "p-2"
                  : "px-4 py-3 text-sm leading-relaxed",
              isOutbound
                ? "rounded-br-md bg-cos-dark text-[#f6f2eb]"
                : "rounded-bl-md bg-[#eceae4] text-cos-text",
              isPending && "opacity-80",
            )}
          >
            {quotedPreview ? (
              <div
                className={cn(
                  "mb-2 rounded-lg border-l-[3px] px-2.5 py-1.5",
                  isOutbound
                    ? "border-l-[#f6f2eb]/55 bg-white/10"
                    : "border-l-cos-dark/35 bg-black/[0.04]",
                )}
                aria-label={
                  quotedPreview.senderName
                    ? `Replying to ${quotedPreview.senderName}`
                    : "Replying to a message"
                }
              >
                {quotedPreview.senderName ? (
                  <p
                    className={cn(
                      "text-[11px] font-semibold leading-tight",
                      isOutbound ? "text-[#f6f2eb]/80" : "text-cos-muted",
                    )}
                  >
                    {quotedPreview.senderName}
                  </p>
                ) : null}
                <p
                  className={cn(
                    "line-clamp-2 text-xs leading-snug",
                    quotedPreview.senderName && "mt-0.5",
                    isOutbound ? "text-[#f6f2eb]/70" : "text-cos-muted",
                  )}
                >
                  {quotedPreview.snippet}
                </p>
              </div>
            ) : null}
            {stickerUrl ? (
              <img
                src={stickerUrl}
                alt="Sticker"
                className={cn(
                  "max-h-40 max-w-[min(11rem,100%)] rounded-xl object-contain",
                  showTextBody && "mb-2",
                )}
                loading="lazy"
              />
            ) : null}
            {showTextBody ? (
              <p
                className={cn(
                  "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
                  jumboEmojiCount === 1 && "text-[3.75rem] leading-none",
                  jumboEmojiCount != null &&
                    jumboEmojiCount > 1 &&
                    "text-[3rem] leading-none",
                )}
              >
                {message.body}
              </p>
            ) : null}
          </div>

          {/* Hover actions: pad (not margin) so bubble→icon path stays in the group. */}
          <div
            ref={actionsRef}
            className={cn(
              "pointer-events-none absolute top-1/2 z-20 hidden -translate-y-1/2 opacity-0 transition-opacity sm:flex",
              "group-hover/bubble:pointer-events-auto group-hover/bubble:opacity-100",
              "group-focus-within/bubble:pointer-events-auto group-focus-within/bubble:opacity-100",
              pickerOpen && "pointer-events-auto opacity-100",
              isOutbound ? "right-full pr-1.5" : "left-full pl-1.5",
            )}
            role="toolbar"
            aria-label="Message actions"
          >
            <div className="flex items-center gap-0.5 rounded-full border border-cos-border bg-white p-0.5 shadow-sm">
              <button
                type="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  openPicker();
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text focus-visible:bg-cos-bg focus-visible:text-cos-text focus-visible:outline-none"
                aria-label="Choose emoji reaction"
                aria-expanded={pickerOpen}
                aria-haspopup="true"
                title="React"
              >
                <Smile className="h-3.5 w-3.5" aria-hidden />
              </button>
              {showHoverReply ? (
                <button
                  type="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onReplyToMessage?.(message);
                  }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text focus-visible:bg-cos-bg focus-visible:text-cos-text focus-visible:outline-none"
                  aria-label="Reply to this message"
                  title="Reply"
                >
                  <Reply className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {pickerOpen &&
          pickerCoords &&
          typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={pickerRef}
                  className="fixed z-[80] flex flex-col gap-1 rounded-2xl border border-cos-border bg-white px-1.5 py-1.5 shadow-md"
                  style={{
                    top: pickerCoords.top,
                    left: pickerCoords.left,
                    transform: pickerCoords.openUp
                      ? "translateY(-100%)"
                      : undefined,
                  }}
                  role="toolbar"
                  aria-label="Quick reactions"
                >
                  <div className="flex items-center gap-1">
                    {BUBBLE_QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        disabled={isPending}
                        onClick={() => applyReaction(emoji)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-full text-base transition-colors hover:bg-cos-bg",
                          reaction === emoji &&
                            "bg-cos-bg ring-1 ring-cos-border",
                        )}
                        aria-label={
                          commentsLikeOnly && emoji === "❤️"
                            ? "React with heart (posts as Like on comments)"
                            : `React with ${emoji}`
                        }
                        aria-pressed={reaction === emoji}
                        title={
                          commentsLikeOnly && emoji === "❤️"
                            ? "Comments only support Like — this posts as Like"
                            : undefined
                        }
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {commentsLikeOnly ? (
                    <p className="max-w-[11rem] px-1 pb-0.5 text-[10px] leading-snug text-cos-muted">
                      Comments support Like only — ❤️ posts as Like
                    </p>
                  ) : null}
                </div>,
                document.body,
              )
            : null}

          {reaction ? (
            <span
              className={cn(
                "pointer-events-none absolute z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white bg-white px-1 text-sm leading-none shadow-[0_1px_3px_rgba(42,38,34,0.18)]",
                isOutbound
                  ? "right-1 bottom-3 translate-y-1/2"
                  : "left-1 bottom-3 translate-y-1/2",
              )}
              aria-label={
                mappedToLike
                  ? `Reacted ${reaction} (Like on Meta)`
                  : `Reacted ${reaction}`
              }
            >
              {reaction}
            </span>
          ) : null}
        </div>

        {mappedToLike || localOnly ? (
          <div
            className={cn(
              "mt-0.5 flex flex-col gap-0.5",
              isOutbound && "items-end",
            )}
          >
            {mappedToLike ? (
              <span className="px-1 text-[10px] text-cos-muted">Like on Meta</span>
            ) : null}
            {localOnly ? (
              <span className="px-1 text-[10px] text-cos-muted">Hey Ralli only</span>
            ) : null}
          </div>
        ) : null}

        {reactionError ? (
          <p
            className={cn(
              "mt-1 max-w-xs text-xs text-red-700",
              isOutbound && "text-right",
            )}
            role="alert"
          >
            {reactionError}
          </p>
        ) : null}
        {reactionWarning && !reactionError ? (
          <p
            className={cn(
              "mt-1 max-w-xs text-xs text-amber-800",
              isOutbound && "text-right",
            )}
            role="status"
          >
            {reactionWarning}
          </p>
        ) : null}

        {message.sentAt ? (
          <time
            className={cn(
              "mt-1.5 block px-1 text-xs text-cos-muted",
              isOutbound && "text-right",
            )}
            dateTime={message.sentAt}
          >
            {formatMessageTime(message.sentAt)}
            {isOutbound ? " · Sent" : null}
          </time>
        ) : null}
      </div>
    </li>
  );
}
