"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { User } from "lucide-react";
import { isCommentChannel } from "@/lib/inbox/constants";
import { setInboxMessageReactionAction } from "@/lib/inbox/actions";
import { getJumboEmojiCount } from "@/lib/inbox/jumbo-emoji";
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

const DOUBLE_TAP_MS = 320;
const IMAGE_PLACEHOLDER_BODIES = new Set(["📎 Sticker", "📎 GIF"]);

function MessageAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null;
  initials: string;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cos-bg text-[10px] font-semibold text-cos-text"
      aria-hidden
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : initials !== "?" ? (
        initials
      ) : (
        <User className="h-4 w-4 text-cos-muted" strokeWidth={1.75} />
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: InboxMessage;
  isOutbound: boolean;
  avatarUrl: string | null;
  avatarName: string | null;
  initials: string;
}

export function MessageBubble({
  message,
  isOutbound,
  avatarUrl,
  avatarName,
  initials,
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
  const [isPending, startTransition] = useTransition();
  const lastTapRef = useRef(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const stickerUrl = readMessageStickerUrl(message.metadata);
  const textBody = message.body?.trim() ?? "";
  const showTextBody =
    Boolean(textBody) &&
    !(stickerUrl && IMAGE_PLACEHOLDER_BODIES.has(textBody));
  // Image stickers stay images; jumbo only applies to emoji-only text bodies.
  const jumboEmojiCount =
    showTextBody && !stickerUrl ? getJumboEmojiCount(textBody) : null;
  const commentsLikeOnly = isCommentChannel(message.channelType);

  useEffect(() => {
    setReaction(readLocalMessageReaction(message.metadata));
    setMappedToLike(readMetaReactionMappedToLike(message.metadata));
    setLocalOnly(readLocalReactionOnly(message.metadata));
  }, [message.id, message.metadata]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
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
        "flex w-fit min-w-0 max-w-[min(85%,100%)] items-end gap-2",
        isOutbound && "ml-auto flex-row-reverse",
      )}
    >
      <MessageAvatar avatarUrl={avatarUrl} initials={initials} />
      <div className="relative min-w-0 max-w-full">
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
              : stickerUrl && !showTextBody
                ? "p-2"
                : "px-4 py-3 text-sm leading-relaxed",
            isOutbound
              ? "rounded-br-md bg-cos-dark text-[#f6f2eb]"
              : "rounded-bl-md bg-[#eceae4] text-cos-text",
            isPending && "opacity-80",
          )}
        >
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

        {pickerOpen ? (
          <div
            ref={pickerRef}
            className={cn(
              "absolute z-20 flex flex-col gap-1 rounded-2xl border border-cos-border bg-white px-1.5 py-1.5 shadow-md",
              isOutbound ? "right-0 bottom-full mb-2" : "left-0 bottom-full mb-2",
            )}
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
                    reaction === emoji && "bg-cos-bg ring-1 ring-cos-border",
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
          </div>
        ) : null}

        {reaction ? (
          <div className={cn("mt-1 flex flex-col gap-0.5", isOutbound && "items-end")}>
            <span
              className="inline-flex items-center rounded-full border border-cos-border bg-white px-1.5 py-0.5 text-sm shadow-sm"
              aria-label={
                mappedToLike
                  ? `Reacted ${reaction} (Like on Meta)`
                  : `Reacted ${reaction}`
              }
            >
              {reaction}
            </span>
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
