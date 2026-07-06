"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Inbox, MessageCircle, MessagesSquare } from "lucide-react";
import { InboxCommentPostPreview } from "@/components/inbox/InboxCommentPostPreview";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { InboxTaggedPanel } from "@/components/inbox/InboxTaggedPanel";
import { InboxThreadReplyPanel } from "@/components/inbox/InboxThreadReplyPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  INBOX_CHANNEL_LABELS,
  INBOX_CHANNEL_SHORT_LABELS,
  INBOX_CHANNEL_TYPES,
  INBOX_TAG_CHANNEL_TYPES,
  isCommentChannel,
  isReplyChannel,
  isTaggedChannel,
} from "@/lib/inbox/constants";
import type { InboxChannelType, InboxConnectionStatus, InboxMessage, InboxPageData } from "@/lib/inbox/types";
import { formatDateTime, formatMessageTime } from "@/lib/utils/dates";
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
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hr ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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
        "inline-flex items-center gap-2 border px-3 py-2 text-xs tracking-wide transition-colors",
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
          "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
          active ? "bg-white/15 text-[#f6f2eb]" : "bg-cos-bg text-cos-text",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function readThreadPermalink(thread: InboxPageData["threads"][number]): string | null {
  const permalink = thread.metadata?.permalink;
  return typeof permalink === "string" && permalink.trim() ? permalink : null;
}

function ThreadHeader({
  channelType,
  participantName,
  pageName,
}: {
  channelType: InboxChannelType;
  participantName: string | null;
  pageName: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cos-border/60 bg-cos-card/50 px-6 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <InboxPlatformIcon channelType={channelType} size="sm" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-cos-text">
            {INBOX_CHANNEL_LABELS[channelType]}
          </p>
          {participantName ? (
            <p className="mt-0.5 truncate text-[11px] text-cos-muted">
              with {participantName}
            </p>
          ) : null}
        </div>
      </div>
      {pageName ? (
        <p className="shrink-0 text-[11px] text-cos-muted">via {pageName}</p>
      ) : null}
    </div>
  );
}

function ThreadMessageList({
  thread,
  messages,
  channelType,
  pageName,
}: {
  thread: InboxPageData["threads"][number];
  messages: InboxMessage[];
  channelType: InboxChannelType;
  pageName: string | null;
}) {
  if (messages.length === 0 && !isTaggedChannel(channelType)) {
    return (
      <div className="border-t border-cos-border bg-cos-bg/40">
        <ThreadHeader
          channelType={channelType}
          participantName={thread.participantName}
          pageName={pageName}
        />
        <p className="px-6 py-4 text-sm text-cos-muted">No messages in this thread yet.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-cos-border bg-cos-bg/40">
      <ThreadHeader
        channelType={channelType}
        participantName={thread.participantName}
        pageName={pageName}
      />

      {messages.length > 0 ? (
        <ul className="flex flex-col gap-3 px-6 py-4" role="list">
          {messages.map((message) => {
            const isOutbound = message.direction === "outbound";

            return (
              <li
                key={message.id}
                className={cn(
                  "flex max-w-[88%] flex-col",
                  isOutbound ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                    isOutbound
                      ? "rounded-br-sm bg-cos-dark text-[#f6f2eb]"
                      : "rounded-bl-sm border border-cos-border/80 bg-white text-cos-text",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.body}</p>
                </div>
                {message.sentAt ? (
                  <time
                    className="mt-1 px-0.5 text-[10px] tabular-nums text-cos-muted"
                    dateTime={message.sentAt}
                  >
                    {formatMessageTime(message.sentAt)}
                  </time>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {isReplyChannel(channelType) ? (
        <InboxThreadReplyPanel thread={thread} messages={messages} />
      ) : null}

      {isTaggedChannel(channelType) ? (
        <div className="px-6 pb-4">
          <InboxTaggedPanel thread={thread} />
        </div>
      ) : null}
    </div>
  );
}

export function InboxHub({ data }: InboxHubProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
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

  const showConnectionEmptyState = !connection.metaConnected && !connection.metaConfiguredViaEnv;
  const showInboxEmptyState =
    (connection.metaConnected || connection.metaConfiguredViaEnv) && filteredThreads.length === 0;

  return (
    <div className="studio-page space-y-10">
      <header className="border-b border-cos-border pb-8">
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-start gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
              <Inbox className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
            </div>
            <div>
              <p className="studio-eyebrow">Workspace</p>
              <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">Inbox</h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
                Instagram DMs, Facebook Page messages, comments, and tagged posts — with AI-suggested
                replies you approve before sending.
              </p>
            </div>
          </div>
          <InboxStatusChip connection={connection} />
        </div>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-cos-text">Conversations</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Filter by channel. Expand a thread for AI drafts, replies, or reposts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ChannelFilterButton
            label="All channels"
            count={channelCounts.all}
            active={channelFilter === "all"}
            onClick={() => setChannelFilter("all")}
          />
          <ChannelFilterButton
            label="Tagged in"
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

        <Card padding="none" className="overflow-hidden">
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
            <ul className="divide-y divide-cos-border">
              {filteredThreads.map((thread) => {
                const expanded = expandedThreadId === thread.id;
                const messages = messagesByThreadId[thread.id] ?? [];
                const postPermalink = readThreadPermalink(thread);

                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-6 py-4 text-left transition-colors hover:bg-cos-bg/50"
                      aria-expanded={expanded}
                      onClick={() =>
                        setExpandedThreadId(expanded ? null : thread.id)
                      }
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-cos-border bg-cos-bg">
                        <InboxPlatformIcon channelType={thread.channelType} size="md" />
                      </div>
                      <InboxCommentPostPreview
                        thread={thread}
                        className={isCommentChannel(thread.channelType) ? "min-w-0 flex-1" : undefined}
                      >
                      <div
                        className={
                          isCommentChannel(thread.channelType) ? "min-w-0" : "min-w-0 flex-1"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-medium text-cos-text">
                            {thread.participantName ??
                              INBOX_CHANNEL_LABELS[thread.channelType]}
                          </p>
                          {thread.lastMessageAt ? (
                            <time
                              className="shrink-0 text-xs text-cos-muted"
                              dateTime={thread.lastMessageAt}
                            >
                              {formatDateTime(thread.lastMessageAt)}
                            </time>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-cos-muted">
                          {INBOX_CHANNEL_LABELS[thread.channelType]}
                          {thread.subject ? ` · ${thread.subject}` : null}
                          {thread.status === "sent" ? " · Replied" : null}
                        </p>
                        {postPermalink ? (
                          <a
                            href={postPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-medium text-cos-accent hover:text-cos-muted"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View post on{" "}
                            {thread.channelType === "instagram_comment" ||
                            thread.channelType === "instagram_tag"
                              ? "Instagram"
                              : "Facebook"}
                          </a>
                        ) : null}
                        {thread.lastMessageSnippet ? (
                          <p className="mt-2 line-clamp-2 text-sm text-cos-text/90">
                            {thread.lastMessageSnippet}
                          </p>
                        ) : null}
                      </div>
                      </InboxCommentPostPreview>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-cos-muted transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    {expanded ? (
                      <ThreadMessageList
                        thread={thread}
                        messages={messages}
                        channelType={thread.channelType}
                        pageName={connection.pageName}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
