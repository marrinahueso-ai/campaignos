"use client";

import { ArrowLeft, ChevronDown, UserPlus } from "lucide-react";
import { InboxDirectPostLinkButton } from "@/components/inbox/InboxDirectPostLinkButton";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { InboxTaggedPanel } from "@/components/inbox/InboxTaggedPanel";
import { INBOX_CHANNEL_LABELS, isReplyChannel, isTaggedChannel } from "@/lib/inbox/constants";
import { hasThreadPostPermalink } from "@/lib/inbox/comment-post-preview";
import { classifyThreadQueueState } from "@/lib/inbox/queue-utils";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import {
  CommunicationsAiPanel,
  CommunicationsReplySection,
} from "@/components/communications-hub/CommunicationsWorkspacePanels";

function participantInitials(name: string | null): string {
  if (!name?.trim()) {
    return "?";
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

function threadChannelDisplayLabel(thread: InboxThread): string {
  switch (thread.channelType) {
    case "instagram_dm":
      return "Instagram Message";
    case "facebook_message":
      return "Facebook Message";
    case "instagram_comment":
      return "Instagram Comment";
    case "facebook_comment":
      return "Facebook Comment";
    case "instagram_tag":
      return "Instagram Mention";
    case "facebook_tag":
      return "Facebook Mention";
    default:
      return INBOX_CHANNEL_LABELS[thread.channelType];
  }
}

function sortTimelineMessages(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = Date.parse(left.sentAt ?? left.createdAt);
    const rightTime = Date.parse(right.sentAt ?? right.createdAt);
    return leftTime - rightTime;
  });
}

function getTimelineMessages(messages: InboxMessage[]): InboxMessage[] {
  return sortTimelineMessages(
    messages.filter(
      (message) =>
        message.direction === "inbound" ||
        (message.direction === "outbound" && message.status === "sent"),
    ),
  );
}

function ThreadMessageTimeline({ messages }: { messages: InboxMessage[] }) {
  const timelineMessages = getTimelineMessages(messages);

  if (timelineMessages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cos-muted">
        No messages in this thread yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4" role="list">
      {timelineMessages.map((message) => {
        const isOutbound = message.direction === "outbound";

        return (
          <li key={message.id} className={cn("max-w-[85%]", isOutbound && "ml-auto")}>
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                isOutbound
                  ? "rounded-br-md bg-cos-dark text-[#f6f2eb]"
                  : "rounded-bl-md bg-cos-bg text-cos-text",
              )}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
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
          </li>
        );
      })}
    </ul>
  );
}

interface CommunicationsWorkspaceProps {
  thread: InboxThread | null;
  messages: InboxMessage[];
  showBack?: boolean;
  onBack?: () => void;
  showAiPanel?: boolean;
  className?: string;
}

export function CommunicationsWorkspace({
  thread,
  messages,
  showBack,
  onBack,
  showAiPanel = true,
  className,
}: CommunicationsWorkspaceProps) {
  if (!thread) {
    return (
      <div
        className={cn(
          "flex min-h-[20rem] flex-1 flex-col items-center justify-center bg-cos-card px-6 py-16 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-cos-text">Select a conversation</p>
        <p className="mt-1 max-w-xs text-xs text-cos-muted">
          Choose a thread from the queue to view messages, AI drafts, and reply actions.
        </p>
      </div>
    );
  }

  const displayName =
    thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
  const queueState = classifyThreadQueueState(thread, messages);
  const statusLabel = queueState.readyToSend
    ? "Ready to Send"
    : queueState.waitingOnAi
      ? "Waiting on AI"
      : queueState.needsReply
        ? "Needs Reply"
        : queueState.completed
          ? "Completed"
          : "Open";

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1", className)}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-cos-card">
        <div className="flex shrink-0 items-center gap-3 border-b border-cos-border px-5 py-4">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-cos-muted transition-colors hover:bg-cos-bg hover:text-cos-text lg:hidden"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}

          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cos-bg text-xs font-semibold text-cos-text">
            {thread.participantAvatarUrl ? (
              <img
                src={thread.participantAvatarUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ) : (
              participantInitials(thread.participantName)
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-cos-text">{displayName}</p>
            <p className="mt-0.5 text-xs text-cos-muted">
              {threadChannelDisplayLabel(thread)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1 rounded-full border border-cos-border bg-cos-bg px-3 py-1.5 text-xs font-medium text-cos-text sm:inline-flex">
              {statusLabel}
              <ChevronDown className="h-3.5 w-3.5 text-cos-muted" aria-hidden />
            </span>
            <button
              type="button"
              disabled
              title="Assignment coming soon"
              className="hidden h-9 items-center gap-1.5 rounded-full border border-cos-border px-3 text-xs font-medium text-cos-muted opacity-60 sm:inline-flex"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden />
              Assign
            </button>
            {hasThreadPostPermalink(thread) ? (
              <InboxDirectPostLinkButton thread={thread} />
            ) : null}
            <InboxPlatformIcon channelType={thread.channelType} size="md" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <ThreadMessageTimeline messages={messages} />

          {isTaggedChannel(thread.channelType) ? (
            <div className="mt-4 border-t border-cos-border pt-4">
              <InboxTaggedPanel thread={thread} />
            </div>
          ) : null}
        </div>

        {isReplyChannel(thread.channelType) ? (
          <CommunicationsReplySection thread={thread} messages={messages} />
        ) : null}
      </div>

      {showAiPanel ? (
        <CommunicationsAiPanel
          thread={thread}
          messages={messages}
          className="hidden xl:flex"
        />
      ) : null}
    </div>
  );
}
