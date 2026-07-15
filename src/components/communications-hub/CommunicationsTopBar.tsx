"use client";

import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import type { InboxChannelType, InboxConnectionStatus } from "@/lib/inbox/types";
import type { CommunicationsQueueCounts } from "@/lib/inbox/queue-utils";
import { cn } from "@/lib/utils/cn";

interface CommunicationsTopBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  channelFilter: "all" | InboxChannelType;
  onChannelFilterChange: (value: "all" | InboxChannelType) => void;
  queueCounts: CommunicationsQueueCounts;
  connection: InboxConnectionStatus;
  onAiQueueClick: () => void;
  aiQueueActive: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

function formatRelativeUpdated(iso: string | null): string {
  if (!iso) {
    return "just now";
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function MetaConnectionBadge({ connection }: { connection: InboxConnectionStatus }) {
  if (!connection.integrationConfigured && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:border-amber-300"
      >
        Meta not configured
      </Link>
    );
  }

  if (connection.metaReconnectRequired || !connection.metaTokenValid) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:border-red-300"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        Reconnect Meta
      </Link>
    );
  }

  if (!connection.metaConnected && !connection.metaConfiguredViaEnv) {
    return (
      <Link
        href="/settings/meta"
        className="inline-flex items-center gap-2 rounded-full border border-cos-border bg-cos-card px-3 py-1.5 text-xs font-medium text-cos-muted transition-colors hover:text-cos-text"
      >
        Not connected
      </Link>
    );
  }

  const label = connection.pageName ?? "Meta connected";

  return (
    <Link
      href="/settings/meta"
      className="inline-flex items-center gap-2 rounded-full border border-[#b8dcc4] bg-[#e8f5ec] px-3 py-1.5 text-xs font-medium text-[#1a6b4a] transition-colors hover:border-[#9ecfb8]"
      title={
        connection.lastSyncError
          ? `Last sync error: ${connection.lastSyncError}`
          : undefined
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#1a6b4a]" aria-hidden />
      {label}
      <span className="text-[#145a3e]">
        • Updated {formatRelativeUpdated(connection.lastSyncedAt)}
      </span>
    </Link>
  );
}

export function CommunicationsTopBar({
  searchQuery,
  onSearchChange,
  channelFilter,
  onChannelFilterChange,
  queueCounts,
  connection,
  onAiQueueClick,
  aiQueueActive,
  hasActiveFilters,
  onClearFilters,
}: CommunicationsTopBarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-cos-border pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search conversations</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search conversations..."
            className="h-10 w-full rounded-full border border-cos-border bg-cos-card pl-9 pr-4 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-dark focus:outline-none"
          />
        </label>

        <select
          aria-label="Filter by campaign"
          disabled
          title="Campaign filtering coming soon"
          className="h-10 rounded-full border border-cos-border bg-cos-bg px-4 text-sm text-cos-muted"
        >
          <option>All Campaigns</option>
        </select>

        <select
          aria-label="Filter by channel"
          value={channelFilter}
          onChange={(event) =>
            onChannelFilterChange(event.target.value as "all" | InboxChannelType)
          }
          className="h-10 rounded-full border border-cos-border bg-cos-card px-4 text-sm text-cos-text focus:border-cos-dark focus:outline-none"
        >
          <option value="all">All Channels</option>
          <option value="facebook_message">Facebook Messages</option>
          <option value="instagram_dm">Instagram DMs</option>
          <option value="facebook_comment">Facebook Comments</option>
          <option value="instagram_comment">Instagram Comments</option>
          <option value="facebook_tag">Facebook Mentions</option>
          <option value="instagram_tag">Instagram Mentions</option>
        </select>

        <button
          type="button"
          onClick={onAiQueueClick}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            aiQueueActive
              ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
              : queueCounts.waitingOnAi > 0
                ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                : "border-cos-border bg-cos-card text-cos-text hover:border-cos-dark",
          )}
          aria-label={`AI queue: ${queueCounts.waitingOnAi} waiting`}
          aria-pressed={aiQueueActive}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          AI Queue
          {queueCounts.waitingOnAi > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[11px] font-semibold tabular-nums">
              {queueCounts.waitingOnAi}
            </span>
          ) : null}
        </button>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex h-10 items-center rounded-full border border-cos-border bg-cos-card px-4 text-sm font-medium text-cos-text transition-colors hover:border-cos-dark"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <MetaConnectionBadge connection={connection} />
    </div>
  );
}
