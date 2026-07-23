"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MessagesSquare,
  Repeat2,
} from "lucide-react";
import { InstagramPlatformIcon } from "@/components/communications-planning-calendar/MetaPlatformIcons";
import { InboxDirectPostLinkButton } from "@/components/inbox/InboxDirectPostLinkButton";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { InboxTaggedPanel } from "@/components/inbox/InboxTaggedPanel";
import { InboxThreadReplyPanel } from "@/components/inbox/InboxThreadReplyPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { hasThreadPostPermalink } from "@/lib/inbox/comment-post-preview";
import {
  INBOX_CHANNEL_LABELS,
  isCommentChannel,
  isInstagramChannel,
  isReplyChannel,
  isTaggedChannel,
} from "@/lib/inbox/constants";
import {
  getTimelineMessages,
  isOutboundTimelineMessage,
} from "@/lib/inbox/timeline-messages";
import type {
  InboxChannelType,
  InboxConnectionStatus,
  InboxMessage,
  InboxPageData,
  InboxThread,
} from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { markInboxThreadReadAction } from "@/lib/inbox/actions";
import { cn } from "@/lib/utils/cn";

type CategoryFilter = "all" | "messages" | "comments" | "mentions";
type PlatformFilter = "all" | "instagram";

interface InboxHubProps {
  data: InboxPageData;
}

function formatRelativeUpdated(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function threadChannelDisplayLabel(channelType: InboxChannelType): string {
  switch (channelType) {
    case "instagram_dm":
      return "Instagram DM";
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
      return INBOX_CHANNEL_LABELS[channelType];
  }
}

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

function isMessageChannel(channelType: InboxChannelType): boolean {
  return channelType === "instagram_dm" || channelType === "facebook_message";
}

function matchesCategoryFilter(
  channelType: InboxChannelType,
  filter: CategoryFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "messages":
      return isMessageChannel(channelType);
    case "comments":
      return isCommentChannel(channelType);
    case "mentions":
      return isTaggedChannel(channelType);
  }
}

function InboxStatusChip({ connection }: { connection: InboxConnectionStatus }) {
  if (!connection.integrationConfigured && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:border-amber-300"
      >
        Meta not configured
      </Link>
    );
  }

  if (!connection.metaConnected && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-[#d8d8d6] bg-white px-3.5 py-1.5 text-xs font-medium text-[#8a8a88] transition-colors hover:border-[#b8b8b6] hover:text-[#1a1a1a]"
      >
        Not connected
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-[#b8dcc4] bg-[#e8f5ec] px-3.5 py-1.5 text-xs font-medium text-[#1a6b4a] transition-colors hover:border-[#9ecfb8]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#1a6b4a]" aria-hidden />
        Connected • Pro plan
      </Link>
      <span className="text-xs text-[#8a8a88]">
        Updated {connection.lastSyncedAt ? formatRelativeUpdated(connection.lastSyncedAt) : "just now"}
      </span>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  badge,
  trailingIcon,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: number;
  trailingIcon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
          : "border-[#d8d8d6] bg-white text-[#1a1a1a] hover:border-[#b8b8b6]",
      )}
      aria-pressed={active}
    >
      <span>{label}</span>
      {badge !== undefined ? (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
            active ? "bg-white/15 text-white" : "bg-[#8a8a88] text-white",
          )}
        >
          {badge}
        </span>
      ) : null}
      {trailingIcon}
    </button>
  );
}

function ThreadAvatar({ thread }: { thread: InboxThread }) {
  const avatarUrl = thread.participantAvatarUrl;

  return (
    <div className="relative shrink-0">
      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#efefed] text-xs font-semibold text-[#1a1a1a]">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          participantInitials(thread.participantName)
        )}
      </div>
    </div>
  );
}

function ConversationListRow({
  thread,
  selected,
  onSelect,
}: {
  thread: InboxThread;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayName =
    thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
  const hasUnread = thread.unreadCount > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex w-full items-start gap-3 px-5 py-4 text-left transition-colors",
        selected ? "bg-[#f3f3f2]" : "hover:bg-[#fafaf9]",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <ThreadAvatar thread={thread} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-[#1a1a1a]">{displayName}</p>
          {hasUnread ? (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#007aff]"
              aria-label="Unread"
            />
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-[#8a8a88]">
          {threadChannelDisplayLabel(thread.channelType)}
          {thread.lastMessageAt ? ` • ${formatRelativeUpdated(thread.lastMessageAt)}` : null}
        </p>
        {thread.lastMessageSnippet ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-[#4a4a48]">
            {thread.lastMessageSnippet}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function ThreadMessageList({
  messages,
  channelType,
}: {
  messages: InboxMessage[];
  channelType: InboxThread["channelType"];
}) {
  const timelineMessages = getTimelineMessages(messages, channelType);

  if (timelineMessages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[#8a8a88]">
        No messages in this thread yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4" role="list">
      {timelineMessages.map((message) => {
        const isOutbound = isOutboundTimelineMessage(message);
        return (
          <li key={message.id} className={cn("max-w-[85%]", isOutbound && "ml-auto")}>
            <div
              className={cn(
                "rounded-[1.25rem] px-4 py-3 text-sm leading-relaxed",
                isOutbound
                  ? "rounded-br-md bg-[#1a1a1a] text-white"
                  : "rounded-bl-md bg-[#f3f3f2] text-[#1a1a1a]",
              )}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
            {message.sentAt ? (
              <time
                className={cn(
                  "mt-1.5 block px-1 text-xs text-[#8a8a88]",
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

function ConversationPanel({
  thread,
  messages,
  onBack,
  showBack,
}: {
  thread: InboxThread;
  messages: InboxMessage[];
  onBack?: () => void;
  showBack?: boolean;
}) {
  const displayName =
    thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
  const showDirectPostLink = hasThreadPostPermalink(thread);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-[#ebebea] px-6 py-4">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8a8a88] transition-colors hover:bg-[#f3f3f2] hover:text-[#1a1a1a] lg:hidden"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}

        <ThreadAvatar thread={thread} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-[#1a1a1a]">{displayName}</p>
          <p className="mt-0.5 text-sm text-[#8a8a88]">
            {threadChannelDisplayLabel(thread.channelType)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showDirectPostLink ? <InboxDirectPostLinkButton thread={thread} /> : null}
          <InboxPlatformIcon channelType={thread.channelType} size="md" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <ThreadMessageList messages={messages} channelType={thread.channelType} />

        {isTaggedChannel(thread.channelType) ? (
          <div className="mt-4 border-t border-[#ebebea] pt-4">
            <InboxTaggedPanel thread={thread} />
          </div>
        ) : null}
      </div>

      {isReplyChannel(thread.channelType) ? (
        <InboxThreadReplyPanel thread={thread} messages={messages} />
      ) : null}
    </div>
  );
}

function RepostBanner() {
  return (
    <button
      type="button"
      className="group flex w-full items-center gap-4 rounded-[1.25rem] border border-[#ebebea] bg-white px-5 py-4 text-left shadow-[0_8px_24px_rgba(26,26,26,0.06)] transition-colors hover:border-[#d8d8d6]"
    >
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-white">
        <Repeat2 className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1a1a1a]">Repost this moment</span>
        <span className="mt-0.5 block text-sm text-[#8a8a88]">
          Turn this post or comment into new content.
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#8a8a88] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function InboxHub({ data }: InboxHubProps) {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const { connection, threads, messagesByThreadId } = data;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function refreshInbox() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    function startPolling() {
      if (intervalId) {
        return;
      }
      intervalId = setInterval(refreshInbox, 60_000);
    }

    function stopPolling() {
      if (!intervalId) {
        return;
      }
      clearInterval(intervalId);
      intervalId = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshInbox();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  const unreadCount = useMemo(
    () => threads.filter((thread) => thread.unreadCount > 0).length,
    [threads],
  );

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (!matchesCategoryFilter(thread.channelType, categoryFilter)) {
        return false;
      }
      if (platformFilter === "instagram" && !isInstagramChannel(thread.channelType)) {
        return false;
      }
      if (unreadOnly && thread.unreadCount <= 0) {
        return false;
      }
      return true;
    });
  }, [categoryFilter, platformFilter, threads, unreadOnly]);

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.id === selectedThreadId) ?? null,
    [filteredThreads, selectedThreadId],
  );

  useEffect(() => {
    if (selectedThreadId && !filteredThreads.some((thread) => thread.id === selectedThreadId)) {
      setSelectedThreadId(null);
      setMobileShowDetail(false);
    }
  }, [filteredThreads, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId && filteredThreads.length > 0) {
      setSelectedThreadId(filteredThreads[0]!.id);
    }
  }, [filteredThreads, selectedThreadId]);

  const showConnectionEmptyState = !connection.metaConnected && !connection.metaConfiguredViaEnv;
  const showInboxEmptyState =
    (connection.metaConnected || connection.metaConfiguredViaEnv) && filteredThreads.length === 0;

  function handleSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setMobileShowDetail(true);
    void markInboxThreadReadAction({ threadId }).then((result) => {
      if (result.success) {
        router.refresh();
      }
    });
  }

  function handleBackToList() {
    setMobileShowDetail(false);
  }

  function toggleInstagramFilter() {
    setPlatformFilter((current) => (current === "instagram" ? "all" : "instagram"));
  }

  return (
    <div className="relative mx-auto w-full max-w-[88rem] px-1 pb-28 pt-2">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="font-display text-[2.75rem] leading-none text-[#1a1a1a] sm:text-5xl">
            Inbox
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8a8a88]">
            Messages, comments, and mentions from all your channels. AI searches your content
            first to give smart, helpful replies.
          </p>
        </div>
        <InboxStatusChip connection={connection} />
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill
          label="All"
          active={categoryFilter === "all" && platformFilter === "all" && !unreadOnly}
          onClick={() => {
            setCategoryFilter("all");
            setPlatformFilter("all");
            setUnreadOnly(false);
          }}
          trailingIcon={<ChevronDown className="h-4 w-4 opacity-80" />}
        />
        <FilterPill
          label="Messages"
          active={categoryFilter === "messages" && !unreadOnly}
          onClick={() => {
            setCategoryFilter("messages");
            setUnreadOnly(false);
          }}
        />
        <FilterPill
          label="Comments"
          active={categoryFilter === "comments" && !unreadOnly}
          onClick={() => {
            setCategoryFilter("comments");
            setUnreadOnly(false);
          }}
        />
        <FilterPill
          label="Mentions"
          active={categoryFilter === "mentions" && !unreadOnly}
          onClick={() => {
            setCategoryFilter("mentions");
            setUnreadOnly(false);
          }}
        />
        <button
          type="button"
          onClick={toggleInstagramFilter}
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
            platformFilter === "instagram"
              ? "border-[#1a1a1a] bg-[#1a1a1a]"
              : "border-[#d8d8d6] bg-white hover:border-[#b8b8b6]",
          )}
          aria-label="Filter Instagram"
          aria-pressed={platformFilter === "instagram"}
        >
          <InstagramPlatformIcon
            className={cn("h-5 w-5", platformFilter === "instagram" ? "brightness-0 invert" : "")}
          />
        </button>
        <FilterPill
          label="Unread"
          active={unreadOnly}
          onClick={() => setUnreadOnly((current) => !current)}
          badge={unreadCount}
        />
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-[#ebebea] bg-white shadow-[0_1px_2px_rgba(26,26,26,0.04)]">
        {showConnectionEmptyState ? (
          <EmptyState
            icon={MessagesSquare}
            title="Connect Meta to get started"
            description="Link your Facebook Page and Instagram in Settings. Messages will appear here automatically."
            action={{
              label: "Open Meta settings",
              href: "/settings/meta",
            }}
            className="py-16"
          />
        ) : showInboxEmptyState ? (
          <EmptyState
            icon={MessageCircle}
            title={
              unreadOnly
                ? "No unread messages"
                : categoryFilter === "all"
                  ? "No messages yet"
                  : categoryFilter === "mentions"
                    ? "No mentions yet"
                    : `No ${categoryFilter} yet`
            }
            description="New DMs, comments, and mentions will show up here as they arrive."
            className="py-16"
          />
        ) : (
          <div className="flex min-h-[min(720px,calc(100vh-14rem))] flex-col lg:flex-row">
            <aside
              className={cn(
                "flex w-full shrink-0 flex-col border-b border-[#ebebea] lg:w-[min(100%,22rem)] lg:max-w-[34%] lg:border-r lg:border-b-0",
                mobileShowDetail ? "hidden lg:flex" : "flex min-h-0 flex-1 lg:min-h-0 lg:flex-none",
              )}
            >
              <ul className="min-h-0 flex-1 divide-y divide-[#ebebea] overflow-y-auto" role="list">
                {filteredThreads.map((thread) => (
                  <li key={thread.id}>
                    <ConversationListRow
                      thread={thread}
                      selected={selectedThreadId === thread.id}
                      onSelect={() => handleSelectThread(thread.id)}
                    />
                  </li>
                ))}
              </ul>
            </aside>

            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                !mobileShowDetail && "hidden lg:flex",
              )}
            >
              {selectedThread ? (
                <ConversationPanel
                  thread={selectedThread}
                  messages={messagesByThreadId[selectedThread.id] ?? []}
                  showBack
                  onBack={handleBackToList}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                  <MessageCircle
                    className="h-10 w-10 text-[#d4d4d2]"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="mt-4 text-sm font-medium text-[#1a1a1a]">Select a conversation</p>
                  <p className="mt-1 max-w-xs text-xs text-[#8a8a88]">
                    Choose a thread from the list to view messages and reply with AI-assisted drafts.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 mx-auto w-full max-w-[88rem] px-4 sm:px-6">
        <div className="pointer-events-auto">
          <RepostBanner />
        </div>
      </div>
    </div>
  );
}
