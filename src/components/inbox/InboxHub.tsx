"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Inbox,
  MessageCircle,
  MessagesSquare,
  Settings,
} from "lucide-react";
import { InboxDirectPostLinkButton } from "@/components/inbox/InboxDirectPostLinkButton";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { InboxTaggedPanel } from "@/components/inbox/InboxTaggedPanel";
import { InboxThreadReplyPanel } from "@/components/inbox/InboxThreadReplyPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { hasThreadPostPermalink } from "@/lib/inbox/comment-post-preview";
import {
  INBOX_CHANNEL_LABELS,
  INBOX_CHANNEL_SHORT_LABELS,
  INBOX_CHANNEL_TYPES,
  INBOX_TAG_CHANNEL_TYPES,
  isCommentChannel,
  isReplyChannel,
  isTaggedChannel,
} from "@/lib/inbox/constants";
import type {
  InboxChannelType,
  InboxConnectionStatus,
  InboxMessage,
  InboxPageData,
  InboxThread,
} from "@/lib/inbox/types";
import { formatMessageTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

type ChannelFilter = "all" | "tagged" | InboxChannelType;

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

function channelKindLabel(channelType: InboxChannelType): string {
  if (channelType === "instagram_dm" || channelType === "facebook_message") {
    return "PRIVATE MESSAGE";
  }
  if (isCommentChannel(channelType)) {
    return "COMMENT";
  }
  return "TAGGED";
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

function InboxStatusChip({ connection }: { connection: InboxConnectionStatus }) {
  if (!connection.integrationConfigured && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-900 transition-colors hover:border-amber-300"
      >
        Meta not configured
        <span className="font-medium">Settings</span>
      </Link>
    );
  }

  if (!connection.metaConnected && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-cos-border bg-cos-card px-3 py-1 text-xs text-cos-muted transition-colors hover:border-cos-muted hover:text-cos-text"
      >
        Not connected
        <span className="font-medium text-cos-accent">Connect in Settings</span>
      </Link>
    );
  }

  const label = connection.pageName ?? connection.organizationName ?? "Connected";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 transition-colors hover:border-emerald-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        Connected · {label}
      </Link>
      {connection.lastSyncedAt ? (
        <span className="text-xs text-cos-muted">
          Last updated {formatRelativeUpdated(connection.lastSyncedAt)}
        </span>
      ) : null}
    </div>
  );
}

function ChannelFilterButton({
  label,
  count,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] tracking-wide transition-colors",
        active
          ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
          : "border-cos-border bg-cos-card text-cos-muted hover:border-cos-muted hover:text-cos-text",
      )}
      aria-pressed={active}
    >
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "min-w-[1.1rem] rounded-full px-1 py-0.5 text-[9px] font-semibold tabular-nums",
          active ? "bg-white/15 text-[#f6f2eb]" : "bg-cos-bg text-cos-text",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function ThreadAvatar({
  thread,
  selected,
}: {
  thread: InboxThread;
  selected: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold",
          selected
            ? "border-white/30 bg-white/15 text-[#f6f2eb]"
            : "border-cos-border bg-cos-bg text-cos-text",
        )}
      >
        {participantInitials(thread.participantName)}
      </div>
      <span
        className={cn(
          "absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full border bg-cos-card",
          selected ? "border-white/30" : "border-cos-border",
        )}
      >
        <InboxPlatformIcon channelType={thread.channelType} size="xs" />
      </span>
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
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        selected
          ? "bg-cos-dark text-[#f6f2eb]"
          : "hover:bg-cos-bg/70",
      )}
      aria-current={selected ? "true" : undefined}
    >
      <ThreadAvatar thread={thread} selected={selected} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              selected ? "text-[#f6f2eb]" : "text-cos-text",
              hasUnread && !selected && "font-semibold",
            )}
          >
            {displayName}
          </p>
          {thread.lastMessageAt ? (
            <time
              className={cn(
                "shrink-0 text-[10px] tabular-nums",
                selected ? "text-[#f6f2eb]/70" : "text-cos-muted",
              )}
              dateTime={thread.lastMessageAt}
            >
              {formatRelativeUpdated(thread.lastMessageAt)}
            </time>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-xs",
            selected ? "text-[#f6f2eb]/75" : "text-cos-muted",
          )}
        >
          {INBOX_CHANNEL_SHORT_LABELS[thread.channelType]}
          {thread.status === "sent" ? " · Replied" : null}
        </p>
        {thread.lastMessageSnippet ? (
          <p
            className={cn(
              "mt-1 truncate text-sm",
              selected ? "text-[#f6f2eb]/90" : "text-cos-text/80",
              hasUnread && !selected && "font-medium text-cos-text",
            )}
          >
            {thread.lastMessageSnippet}
          </p>
        ) : null}
      </div>
      {hasUnread ? (
        <span
          className={cn(
            "mt-2 h-2 w-2 shrink-0 rounded-full",
            selected ? "bg-[#f6f2eb]" : "bg-cos-accent",
          )}
          aria-label="Unread"
        />
      ) : null}
    </button>
  );
}

function ThreadMessageList({
  messages,
}: {
  messages: InboxMessage[];
}) {
  if (messages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cos-muted">
        No messages in this thread yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3" role="list">
      {messages.map((message) => {
        const isOutbound = message.direction === "outbound";

        return (
          <li
            key={message.id}
            className={cn(
              "flex max-w-[85%] flex-col",
              isOutbound ? "ml-auto items-end" : "mr-auto items-start",
            )}
          >
            <div
              className={cn(
                "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                isOutbound
                  ? "rounded-br-md bg-cos-dark text-[#f6f2eb]"
                  : "rounded-bl-md border border-cos-border/80 bg-white text-cos-text",
              )}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
            {message.sentAt ? (
              <time
                className="mt-1 px-1 text-[10px] tabular-nums text-cos-muted"
                dateTime={message.sentAt}
              >
                {formatMessageTime(message.sentAt)}
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
  pageName,
  onBack,
  showBack,
}: {
  thread: InboxThread;
  messages: InboxMessage[];
  pageName: string | null;
  onBack?: () => void;
  showBack?: boolean;
}) {
  const displayName =
    thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
  const showDirectPostLink = hasThreadPostPermalink(thread);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-cos-border bg-cos-card px-4 py-3">
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

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <ThreadAvatar thread={thread} selected={false} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-cos-text">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
              <InboxPlatformIcon channelType={thread.channelType} size="xs" />
              {channelKindLabel(thread.channelType)}
              {pageName ? ` · ${pageName}` : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {showDirectPostLink ? <InboxDirectPostLinkButton thread={thread} /> : null}
          <Link
            href="/settings/meta"
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cos-border px-2.5 py-1.5 text-[11px] text-cos-muted transition-colors hover:border-cos-muted hover:text-cos-text"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-cos-bg/60 px-4 py-4">
        <ThreadMessageList messages={messages} />

        {isTaggedChannel(thread.channelType) ? (
          <div className="mt-4 border-t border-cos-border/60 pt-4">
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

export function InboxHub({ data }: InboxHubProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const { connection, threads, messagesByThreadId, channelCounts } = data;

  const filteredThreads = useMemo(() => {
    if (channelFilter === "all") {
      return threads;
    }
    if (channelFilter === "tagged") {
      return threads.filter((thread) => isTaggedChannel(thread.channelType));
    }
    return threads.filter((thread) => thread.channelType === channelFilter);
  }, [channelFilter, threads]);

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

  const showConnectionEmptyState = !connection.metaConnected && !connection.metaConfiguredViaEnv;
  const showInboxEmptyState =
    (connection.metaConnected || connection.metaConfiguredViaEnv) && filteredThreads.length === 0;

  function handleSelectThread(threadId: string) {
    setSelectedThreadId(threadId);
    setMobileShowDetail(true);
  }

  function handleBackToList() {
    setMobileShowDetail(false);
  }

  return (
    <div className="studio-page space-y-8">
      <header className="border-b border-cos-border pb-6">
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
              <Inbox className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
            </div>
            <div>
              <p className="studio-eyebrow">Workspace</p>
              <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">Inbox</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
                Instagram DMs, Facebook Page messages, comments, and tagged posts — with
                AI-suggested replies you approve before sending.
              </p>
            </div>
          </div>
          <InboxStatusChip connection={connection} />
        </div>
      </header>

      <Card
        padding="none"
        className="flex min-h-[min(720px,calc(100vh-14rem))] flex-col overflow-hidden lg:flex-row"
      >
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
              channelFilter === "all"
                ? "No messages yet"
                : channelFilter === "tagged"
                  ? "No tagged posts yet"
                  : `No ${INBOX_CHANNEL_LABELS[channelFilter].toLowerCase()} yet`
            }
            description="New DMs, comments, and tags will show up here as they arrive."
            className="py-16"
          />
        ) : (
          <>
            <aside
              className={cn(
                "flex w-full shrink-0 flex-col border-b border-cos-border lg:w-80 lg:border-r lg:border-b-0",
                mobileShowDetail ? "hidden lg:flex" : "flex min-h-0 flex-1 lg:min-h-0 lg:flex-none",
              )}
            >
              <div className="shrink-0 border-b border-cos-border px-3 py-3">
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <ChannelFilterButton
                    label="All"
                    count={channelCounts.all}
                    active={channelFilter === "all"}
                    onClick={() => setChannelFilter("all")}
                  />
                  <ChannelFilterButton
                    label="Tagged"
                    count={channelCounts.tagged}
                    active={channelFilter === "tagged"}
                    onClick={() => setChannelFilter("tagged")}
                  />
                  {INBOX_CHANNEL_TYPES.filter(
                    (channel) => !INBOX_TAG_CHANNEL_TYPES.includes(channel),
                  ).map((channel) => (
                    <ChannelFilterButton
                      key={channel}
                      label={INBOX_CHANNEL_SHORT_LABELS[channel]}
                      count={channelCounts[channel]}
                      active={channelFilter === channel}
                      onClick={() => setChannelFilter(channel)}
                      icon={<InboxPlatformIcon channelType={channel} size="xs" />}
                    />
                  ))}
                </div>
              </div>

              <ul className="min-h-0 flex-1 divide-y divide-cos-border overflow-y-auto" role="list">
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
                "flex min-h-0 min-w-0 flex-1 flex-col bg-cos-card",
                !mobileShowDetail && "hidden lg:flex",
              )}
            >
              {selectedThread ? (
                <ConversationPanel
                  thread={selectedThread}
                  messages={messagesByThreadId[selectedThread.id] ?? []}
                  pageName={connection.pageName}
                  showBack
                  onBack={handleBackToList}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
                  <MessageCircle
                    className="h-10 w-10 text-cos-muted/50"
                    strokeWidth={1.25}
                    aria-hidden
                  />
                  <p className="mt-4 text-sm font-medium text-cos-text">Select a conversation</p>
                  <p className="mt-1 max-w-xs text-xs text-cos-muted">
                    Choose a thread from the list to view messages and reply with AI-assisted drafts.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
