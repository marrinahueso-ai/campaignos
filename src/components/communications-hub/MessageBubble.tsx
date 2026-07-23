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
import { setInboxMessageReactionAction } from "@/lib/inbox/actions";
import {
  BUBBLE_QUICK_REACTIONS,
  readLocalMessageReaction,
  readMessageStickerUrl,
  type BubbleQuickReaction,
} from "@/lib/inbox/stickers";
import type { InboxMessage } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const DOUBLE_TAP_MS = 320;
const STICKER_PLACEHOLDER_BODY = "📎 Sticker";

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lastTapRef = useRef(0);
  const pickerRef = useRef<HTMLDivElement>(null);
  const stickerUrl = readMessageStickerUrl(message.metadata);
  const textBody = message.body?.trim() ?? "";
  const showTextBody =
    Boolean(textBody) && !(stickerUrl && textBody === STICKER_PLACEHOLDER_BODY);

  useEffect(() => {
    setReaction(readLocalMessageReaction(message.metadata));
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
  }, []);

  const applyReaction = useCallback(
    (next: BubbleQuickReaction) => {
      const previous = reaction;
      // Toggle off when selecting the same reaction again.
      const resolved = previous === next ? null : next;
      setReaction(resolved);
      setPickerOpen(false);
      startTransition(async () => {
        const result = await setInboxMessageReactionAction({
          messageId: message.id,
          reaction: resolved,
        });
        if (!result.success) {
          setReaction(previous);
        }
      });
    },
    [message.id, reaction],
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
        "flex max-w-[85%] items-end gap-2",
        isOutbound && "ml-auto flex-row-reverse",
      )}
    >
      <MessageAvatar avatarUrl={avatarUrl} initials={initials} />
      <div className="relative min-w-0">
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
            "select-none rounded-2xl text-sm leading-relaxed touch-manipulation",
            stickerUrl && !showTextBody ? "p-2" : "px-4 py-3",
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
                "max-h-40 max-w-[11rem] rounded-xl object-contain",
                showTextBody && "mb-2",
              )}
              loading="lazy"
            />
          ) : null}
          {showTextBody ? (
            <p className="whitespace-pre-wrap">{message.body}</p>
          ) : null}
        </div>

        {pickerOpen ? (
          <div
            ref={pickerRef}
            className={cn(
              "absolute z-20 flex items-center gap-1 rounded-full border border-cos-border bg-white px-1.5 py-1 shadow-md",
              isOutbound ? "right-0 bottom-full mb-2" : "left-0 bottom-full mb-2",
            )}
            role="toolbar"
            aria-label="Quick reactions"
          >
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
                aria-label={`React with ${emoji}`}
                aria-pressed={reaction === emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}

        {reaction ? (
          <div className={cn("mt-1 flex", isOutbound && "justify-end")}>
            <span
              className="inline-flex items-center rounded-full border border-cos-border bg-white px-1.5 py-0.5 text-sm shadow-sm"
              aria-label={`Reacted ${reaction}`}
            >
              {reaction}
            </span>
          </div>
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
