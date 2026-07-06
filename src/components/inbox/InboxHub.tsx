"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  ChevronDown,
  Inbox,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
} from "lucide-react";
import { InboxConnectionPanel } from "@/components/inbox/InboxConnectionPanel";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  INBOX_CHANNEL_LABELS,
  INBOX_CHANNEL_SHORT_LABELS,
  INBOX_CHANNEL_TYPES,
} from "@/lib/inbox/constants";
import type { InboxChannelType, InboxMessage, InboxPageData } from "@/lib/inbox/types";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

type ChannelFilter = "all" | InboxChannelType;

interface InboxHubProps {
  data: InboxPageData;
}

const CHANNEL_ICONS: Record<InboxChannelType, typeof MessageCircle> = {
  instagram_dm: MessageCircle,
  facebook_message: MessagesSquare,
  instagram_comment: AtSign,
  facebook_comment: MessageSquare,
};

function ChannelFilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
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

function isCommentChannel(channelType: InboxChannelType): boolean {
  return channelType === "instagram_comment" || channelType === "facebook_comment";
}

function ThreadMessageList({
  messages,
  channelType,
}: {
  messages: InboxMessage[];
  channelType: InboxChannelType;
}) {
  if (messages.length === 0) {
    return (
      <p className="px-6 py-4 text-sm text-cos-muted">
        No messages synced for this thread yet.
      </p>
    );
  }

  return (
    <div className="border-t border-cos-border bg-cos-bg/40 px-6 py-4">
      <ul className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              message.direction === "outbound"
                ? "ml-8 border-cos-border bg-cos-card"
                : "mr-8 border-cos-border bg-white",
            )}
          >
            <div className="flex items-center justify-between gap-3 text-xs text-cos-muted">
              <span>
                {message.senderName ??
                  (message.direction === "outbound" ? "You" : "Customer")}
              </span>
              {message.sentAt ? (
                <time dateTime={message.sentAt}>{formatDateTime(message.sentAt)}</time>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-cos-text">{message.body}</p>
          </li>
        ))}
      </ul>
      {isCommentChannel(channelType) ? (
        <div className="mt-4 rounded-md border border-dashed border-cos-border bg-cos-card/60 px-3 py-3">
          <p className="text-xs font-medium text-cos-text">Reply (Phase 4)</p>
          <p className="mt-1 text-xs text-cos-muted">
            Approve-and-send replies to comments will ship in a later phase. For now, open the
            post link below to respond on Instagram or Facebook.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function InboxHub({ data }: InboxHubProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const { connection, threads, messagesByThreadId, channelCounts, oauthError, connectedJustNow } =
    data;

  const filteredThreads = useMemo(() => {
    if (channelFilter === "all") {
      return threads;
    }
    return threads.filter((thread) => thread.channelType === channelFilter);
  }, [channelFilter, threads]);

  const showConnectionEmptyState = !connection.metaConnected && !connection.metaConfiguredViaEnv;
  const showInboxEmptyState =
    (connection.metaConnected || connection.metaConfiguredViaEnv) && filteredThreads.length === 0;

  return (
    <div className="studio-page space-y-10">
      <header className="border-b border-cos-border pb-8">
        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-cos-border bg-cos-card">
            <Inbox className="h-5 w-5 text-cos-accent" strokeWidth={1.5} />
          </div>
          <div>
            <p className="studio-eyebrow">Workspace</p>
            <h1 className="font-display mt-2 text-4xl text-cos-text sm:text-5xl">Inbox</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cos-muted">
              Instagram DMs, Facebook Page messages, and social comments in one place — synced from
              Meta with approve/edit/send workflow coming in later phases.
            </p>
          </div>
        </div>
      </header>

      <Card id="connection">
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Connect Meta, grant inbox permissions, then sync or receive messages via webhooks.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <InboxConnectionPanel
            connection={connection}
            oauthError={oauthError}
            connectedJustNow={connectedJustNow}
          />
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-cos-text">Conversations</h2>
            <p className="mt-1 text-sm text-cos-muted">
              Filter by channel. Click a thread to view messages.
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
          {INBOX_CHANNEL_TYPES.map((channel) => (
              <ChannelFilterButton
                key={channel}
                label={INBOX_CHANNEL_SHORT_LABELS[channel]}
                count={channelCounts[channel]}
                active={channelFilter === channel}
                onClick={() => setChannelFilter(channel)}
              />
            ))}
        </div>

        <Card padding="none" className="overflow-hidden">
          {showConnectionEmptyState ? (
            <EmptyState
              icon={MessagesSquare}
              title="Connect Meta to get started"
              description="Link your Facebook Page and Instagram account above, then grant inbox permissions and run Sync now."
              action={{
                label: "View connection settings",
                href: "#connection",
              }}
              className="py-16"
            />
          ) : showInboxEmptyState ? (
            <EmptyState
              icon={MessageCircle}
              title={
                channelFilter === "all"
                  ? "No messages yet"
                  : `No ${INBOX_CHANNEL_LABELS[channelFilter].toLowerCase()} yet`
              }
              description={
                connection.messagingReady
                  ? "Run Sync now above, or wait for new webhook events to arrive."
                  : "Your Page is connected for publishing. Grant inbox permissions and run Sync now to pull DMs and comments."
              }
              className="py-16"
            />
          ) : (
            <ul className="divide-y divide-cos-border">
              {filteredThreads.map((thread) => {
                const Icon = CHANNEL_ICONS[thread.channelType];
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
                        <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
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
                        </p>
                        {postPermalink ? (
                          <a
                            href={postPermalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs font-medium text-cos-accent hover:text-cos-muted"
                            onClick={(event) => event.stopPropagation()}
                          >
                            View post on {thread.channelType === "instagram_comment" ? "Instagram" : "Facebook"}
                          </a>
                        ) : null}
                        {thread.lastMessageSnippet ? (
                          <p className="mt-2 line-clamp-2 text-sm text-cos-text/90">
                            {thread.lastMessageSnippet}
                          </p>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-4 w-4 shrink-0 text-cos-muted transition-transform",
                          expanded && "rotate-180",
                        )}
                      />
                    </button>
                    {expanded ? (
                      <ThreadMessageList messages={messages} channelType={thread.channelType} />
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
