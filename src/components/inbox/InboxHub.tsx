"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
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
import type { InboxChannelType, InboxPageData } from "@/lib/inbox/types";
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

export function InboxHub({ data }: InboxHubProps) {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const { connection, threads, channelCounts, oauthError, connectedJustNow } = data;

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
              One place for Instagram DMs, Facebook Page messages, and social comments — with AI
              suggested replies and an approve/edit/send workflow coming in later phases.
            </p>
          </div>
        </div>
      </header>

      <Card id="connection">
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Phase 1 connects your Facebook Page and Instagram account. Message sync starts in Phase
            2 after inbox permissions are approved.
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
              Filter by channel. Counts update when Phase 2 sync is enabled.
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
          {INBOX_CHANNEL_TYPES.map((channel) => {
            const Icon = CHANNEL_ICONS[channel];
            return (
              <ChannelFilterButton
                key={channel}
                label={INBOX_CHANNEL_SHORT_LABELS[channel]}
                count={channelCounts[channel]}
                active={channelFilter === channel}
                onClick={() => setChannelFilter(channel)}
              />
            );
          })}
        </div>

        <Card padding="none" className="overflow-hidden">
          {showConnectionEmptyState ? (
            <EmptyState
              icon={MessagesSquare}
              title="Connect Meta to get started"
              description="Link your Facebook Page and Instagram account above. Once connected, CampaignOS will pull DMs and comments here in Phase 2."
              action={{
                label: "View Meta App Review requirements",
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
                  ? "New conversations will appear here as they arrive."
                  : "Your Page is connected for publishing. Inbox sync is coming in Phase 2 — enable messaging permissions in Meta App Review to start receiving DMs and comments."
              }
              className="py-16"
            />
          ) : (
            <ul className="divide-y divide-cos-border">
              {filteredThreads.map((thread) => {
                const Icon = CHANNEL_ICONS[thread.channelType];
                return (
                  <li key={thread.id} className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-cos-border bg-cos-bg">
                        <Icon className="h-4 w-4 text-cos-accent" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-cos-text">
                          {thread.participantName ??
                            INBOX_CHANNEL_LABELS[thread.channelType]}
                        </p>
                        <p className="mt-1 text-xs text-cos-muted">
                          {INBOX_CHANNEL_LABELS[thread.channelType]}
                          {thread.lastMessageSnippet
                            ? ` · ${thread.lastMessageSnippet}`
                            : null}
                        </p>
                      </div>
                    </div>
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
