"use client";

import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { INBOX_CHANNEL_LABELS } from "@/lib/inbox/constants";
import type { CommunicationsQueueCounts, CommunicationsQueueFilter } from "@/lib/inbox/queue-utils";
import { classifyThreadQueueState } from "@/lib/inbox/queue-utils";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

const QUEUE_ITEMS: Array<{
  id: CommunicationsQueueFilter;
  label: string;
  countKey?: keyof CommunicationsQueueCounts;
  shell?: boolean;
}> = [
  { id: "all", label: "All conversations" },
  { id: "needs_reply", label: "Needs Reply", countKey: "needsReply" },
  { id: "unread", label: "Unread", countKey: "unread" },
  { id: "waiting_on_ai", label: "Waiting on AI", countKey: "waitingOnAi" },
  { id: "ready_to_send", label: "Ready to Send", countKey: "readyToSend" },
  { id: "assigned_to_me", label: "Assigned to Me", countKey: "assignedToMe", shell: true },
  { id: "completed", label: "Completed", countKey: "completed" },
  { id: "archived", label: "Archived", countKey: "archived" },
];

function formatRelativeUpdated(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) {
    return "now";
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

function threadStatusLabel(
  thread: InboxThread,
  messages: InboxMessage[],
): string | null {
  if (thread.status === "archived") {
    return "Archived";
  }
  const state = classifyThreadQueueState(thread, messages);
  if (state.readyToSend) {
    return "Ready to Send";
  }
  if (state.waitingOnAi) {
    return "Waiting on AI";
  }
  if (state.needsReply) {
    return "Needs Reply";
  }
  if (state.completed) {
    return "Completed";
  }
  return null;
}

interface CommunicationsQueuePanelProps {
  threads: InboxThread[];
  totalThreadCount: number;
  messagesByThreadId: Record<string, InboxMessage[]>;
  selectedThreadId: string | null;
  queueFilter: CommunicationsQueueFilter;
  queueCounts: CommunicationsQueueCounts;
  onQueueFilterChange: (filter: CommunicationsQueueFilter) => void;
  onSelectThread: (threadId: string) => void;
  className?: string;
}

export function CommunicationsQueuePanel({
  threads,
  totalThreadCount,
  messagesByThreadId,
  selectedThreadId,
  queueFilter,
  queueCounts,
  onQueueFilterChange,
  onSelectThread,
  className,
}: CommunicationsQueuePanelProps) {
  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-cos-border bg-cos-card lg:w-[20rem] lg:max-w-[21.25rem] lg:border-r",
        className,
      )}
    >
      <div className="border-b border-cos-border p-3">
        <ul className="space-y-0.5" role="list">
          {QUEUE_ITEMS.map((item) => {
            const count = item.countKey ? queueCounts[item.countKey] : totalThreadCount;
            const active = queueFilter === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    onQueueFilterChange(active && item.id !== "all" ? "all" : item.id)
                  }
                  disabled={item.shell}
                  title={item.shell ? "Assignment tracking coming soon" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-cos-dark text-[#f6f2eb]"
                      : "text-cos-text hover:bg-cos-bg",
                    item.shell && "opacity-60",
                  )}
                  aria-pressed={active}
                >
                  <span>{item.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                        active ? "bg-white/15 text-white" : "bg-cos-bg text-cos-muted",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-cos-border overflow-y-auto" role="list">
        {threads.map((thread) => {
          const messages = messagesByThreadId[thread.id] ?? [];
          const displayName =
            thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
          const statusLabel = threadStatusLabel(thread, messages);
          const selected = selectedThreadId === thread.id;

          return (
            <li key={thread.id}>
              <button
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  selected ? "bg-cos-bg" : "hover:bg-cos-bg/70",
                )}
                aria-current={selected ? "true" : undefined}
              >
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-cos-bg text-xs font-semibold text-cos-text">
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
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-cos-card p-0.5">
                    <InboxPlatformIcon channelType={thread.channelType} size="sm" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-cos-text">{displayName}</p>
                    <span className="shrink-0 text-[11px] text-cos-muted">
                      {formatRelativeUpdated(thread.lastMessageAt)}
                    </span>
                  </div>
                  {statusLabel ? (
                    <span className="mt-1 inline-flex rounded-full bg-[#fff4e5] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#b45309] uppercase">
                      {statusLabel}
                    </span>
                  ) : null}
                  {thread.lastMessageSnippet ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-cos-muted">
                      {thread.lastMessageSnippet}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
