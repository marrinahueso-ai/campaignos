"use client";

import { useEffect, useId, useState } from "react";
import { Layers, Star } from "lucide-react";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { INBOX_CHANNEL_LABELS } from "@/lib/inbox/constants";
import type { CommunicationsQueueCounts, CommunicationsQueueFilter } from "@/lib/inbox/queue-utils";
import { classifyThreadQueueState } from "@/lib/inbox/queue-utils";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";

type QueueItem = {
  id: CommunicationsQueueFilter;
  label: string;
  countKey?: keyof CommunicationsQueueCounts;
  shell?: boolean;
};

/** Primary Meta-like chips shown in the horizontal row. */
const PRIMARY_CHIPS: QueueItem[] = [
  { id: "unread", label: "Unread", countKey: "unread" },
  { id: "follow_up", label: "Follow up", countKey: "followUp" },
  { id: "completed", label: "Done", countKey: "completed" },
];

/** Secondary / AI workflow filters — Manage menu (not deleted). */
const MANAGE_ITEMS: QueueItem[] = [
  { id: "all", label: "All conversations" },
  { id: "needs_reply", label: "Needs Reply", countKey: "needsReply" },
  { id: "waiting_on_ai", label: "Waiting on AI", countKey: "waitingOnAi" },
  { id: "ready_to_send", label: "Ready to Send", countKey: "readyToSend" },
  { id: "assigned_to_me", label: "Assigned to Me", countKey: "assignedToMe", shell: true },
  { id: "archived", label: "Deleted", countKey: "archived" },
];

function formatListDate(iso: string | null): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    return "Deleted";
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
    return "Done";
  }
  return null;
}

function itemCount(
  item: QueueItem,
  queueCounts: CommunicationsQueueCounts,
  totalThreadCount: number,
): number {
  if (item.countKey) {
    return queueCounts[item.countKey];
  }
  return totalThreadCount;
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
  const [manageOpen, setManageOpen] = useState(false);
  const manageMenuId = useId();

  const activeSecondary = MANAGE_ITEMS.find(
    (item) => item.id !== "all" && item.id === queueFilter,
  );
  const manageHighlightsSecondary = Boolean(activeSecondary);

  useEffect(() => {
    if (!manageOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setManageOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [manageOpen]);

  function selectFilter(id: CommunicationsQueueFilter) {
    onQueueFilterChange(queueFilter === id && id !== "all" ? "all" : id);
    setManageOpen(false);
  }

  const chipsToShow: QueueItem[] = activeSecondary
    ? [...PRIMARY_CHIPS, activeSecondary]
    : PRIMARY_CHIPS;

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-cos-border bg-cos-card lg:w-[20rem] lg:max-w-[21.25rem] lg:border-r",
        className,
      )}
    >
      <div className="border-b border-cos-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="toolbar"
            aria-label="Conversation filters"
          >
            {chipsToShow.map((item) => {
              const count = itemCount(item, queueCounts, totalThreadCount);
              const active = queueFilter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFilter(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                      : "border-cos-border bg-cos-card text-cos-text hover:border-cos-dark hover:bg-cos-bg",
                  )}
                  aria-pressed={active}
                >
                  <span>{item.label}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "tabular-nums",
                        active ? "text-white/80" : "text-cos-muted",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setManageOpen((open) => !open)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                manageOpen || manageHighlightsSecondary
                  ? "border-cos-dark bg-cos-bg text-cos-text"
                  : "border-cos-border bg-cos-card text-cos-text hover:border-cos-dark hover:bg-cos-bg",
              )}
              aria-haspopup="menu"
              aria-expanded={manageOpen}
              aria-controls={manageMenuId}
            >
              <Layers className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              Manage
            </button>

            {manageOpen ? (
              <>
                <button
                  type="button"
                  aria-label="Close manage filters"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setManageOpen(false)}
                />
                <div
                  id={manageMenuId}
                  role="menu"
                  aria-label="More conversation filters"
                  className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-cos-border bg-cos-card p-1.5 shadow-lg"
                >
                  <ul className="space-y-0.5">
                    {MANAGE_ITEMS.map((item) => {
                      const count = itemCount(item, queueCounts, totalThreadCount);
                      const active = queueFilter === item.id;

                      return (
                        <li key={item.id} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => selectFilter(item.id)}
                            disabled={item.shell}
                            title={
                              item.shell ? "Assignment tracking coming soon" : undefined
                            }
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              active
                                ? "bg-cos-dark text-[#f6f2eb]"
                                : "text-cos-text hover:bg-cos-bg",
                              item.shell && "opacity-60",
                            )}
                            aria-checked={active}
                          >
                            <span>{item.label}</span>
                            {count > 0 ? (
                              <span
                                className={cn(
                                  "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                                  active
                                    ? "bg-white/15 text-white"
                                    : "bg-cos-bg text-cos-muted",
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
              </>
            ) : null}
          </div>
        </div>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
        {threads.map((thread) => {
          const messages = messagesByThreadId[thread.id] ?? [];
          const displayName =
            thread.participantName ?? INBOX_CHANNEL_LABELS[thread.channelType];
          const statusLabel = threadStatusLabel(thread, messages);
          const selected = selectedThreadId === thread.id;
          const unread = thread.unreadCount > 0 && thread.status !== "archived";
          const isFollowUp = thread.followUp && thread.status !== "archived";

          return (
            <li key={thread.id} className="border-b border-cos-border/80 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  "relative flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                  selected
                    ? "bg-cos-bg before:absolute before:inset-y-0 before:right-0 before:w-[3px] before:rounded-l-sm before:bg-cos-accent"
                    : "hover:bg-cos-bg/70",
                )}
                aria-current={selected ? "true" : undefined}
              >
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-cos-bg text-xs font-semibold text-cos-text">
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
                  <span className="absolute -right-0.5 -bottom-0.5 rounded-full bg-cos-card p-0.5 shadow-sm ring-1 ring-cos-border/60">
                    <InboxPlatformIcon channelType={thread.channelType} size="sm" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm text-cos-text",
                        unread ? "font-bold" : "font-semibold",
                      )}
                    >
                      {displayName}
                    </p>
                    <span className="shrink-0 text-[11px] text-cos-muted">
                      {formatListDate(thread.lastMessageAt)}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-end justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {statusLabel ? (
                        <span className="mb-0.5 inline-flex rounded-full bg-[#fff4e5] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#b45309] uppercase">
                          {statusLabel}
                        </span>
                      ) : null}
                      {thread.lastMessageSnippet ? (
                        <p
                          className={cn(
                            "line-clamp-1 text-xs leading-snug",
                            unread ? "font-medium text-cos-text" : "text-cos-muted",
                          )}
                        >
                          {thread.lastMessageSnippet}
                        </p>
                      ) : null}
                    </div>
                    {isFollowUp ? (
                      <Star
                        className="mb-0.5 h-3.5 w-3.5 shrink-0 text-[#f59e0b]"
                        fill="currentColor"
                        aria-label="Follow up"
                      />
                    ) : null}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
