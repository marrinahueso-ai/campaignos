"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { InboxDirectPostLinkButton } from "@/components/inbox/InboxDirectPostLinkButton";
import { InboxPlatformIcon } from "@/components/inbox/InboxPlatformIcon";
import { InboxTaggedPanel } from "@/components/inbox/InboxTaggedPanel";
import { INBOX_CHANNEL_LABELS, isReplyChannel, isTaggedChannel } from "@/lib/inbox/constants";
import { hasThreadPostPermalink } from "@/lib/inbox/comment-post-preview";
import {
  archiveInboxThreadAction,
  assignInboxThreadAction,
  markInboxThreadDoneAction,
  toggleInboxThreadFollowUpAction,
  unarchiveInboxThreadAction,
} from "@/lib/inbox/actions";
import { classifyThreadQueueState } from "@/lib/inbox/queue-utils";
import {
  getTimelineMessages,
  isOutboundTimelineMessage,
} from "@/lib/inbox/timeline-messages";
import type { InboxMessage, InboxOrgMember, InboxThread } from "@/lib/inbox/types";
import { cn } from "@/lib/utils/cn";
import { MessageBubble } from "@/components/communications-hub/MessageBubble";
import {
  CommunicationsAiPanel,
  CommunicationsReplySection,
} from "@/components/communications-hub/CommunicationsWorkspacePanels";
import { InboxParticipantAvatar } from "@/components/inbox/InboxParticipantAvatar";

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

function ThreadMessageTimeline({
  messages,
  channelType,
  participantName,
  participantAvatarUrl,
  pageAvatarUrl,
  pageName,
}: {
  messages: InboxMessage[];
  channelType: InboxThread["channelType"];
  participantName: string | null;
  participantAvatarUrl: string | null;
  pageAvatarUrl: string | null;
  pageName: string | null;
}) {
  const timelineMessages = getTimelineMessages(messages, channelType);

  if (timelineMessages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-cos-muted">
        No messages in this thread yet.
      </p>
    );
  }

  const seedMessageId = timelineMessages[0]?.id ?? null;

  return (
    <ul className="flex min-w-0 flex-col gap-3" role="list">
      {timelineMessages.map((message) => {
        const isOutbound = isOutboundTimelineMessage(message, { seedMessageId });
        const avatarUrl = isOutbound
          ? pageAvatarUrl
          : participantAvatarUrl;
        const avatarName = isOutbound
          ? pageName
          : message.senderName ?? participantName;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOutbound={isOutbound}
            avatarUrl={avatarUrl}
            avatarName={avatarName}
          />
        );
      })}
    </ul>
  );
}

const threadActionIdleClassName =
  "bg-cos-bg-alt text-cos-text shadow-[0_1px_0_rgba(255,252,247,0.9)_inset,0_2px_4px_rgba(42,38,34,0.06),0_10px_22px_rgba(42,38,34,0.08)] ring-1 ring-black/[0.04] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(255,252,247,0.95)_inset,0_6px_12px_rgba(42,38,34,0.08),0_16px_32px_rgba(42,38,34,0.1)]";

const threadActionActiveClassName =
  "bg-cos-dark text-white shadow-[0_12px_28px_rgba(42,38,34,0.22)] ring-1 ring-cos-dark";

function threadActionButtonClassName(active = false) {
  return cn(
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 disabled:opacity-60 disabled:hover:translate-y-0",
    active ? threadActionActiveClassName : threadActionIdleClassName,
  );
}

interface CommunicationsWorkspaceProps {
  thread: InboxThread | null;
  messages: InboxMessage[];
  orgMembers?: InboxOrgMember[];
  pageName?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  showAiPanel?: boolean;
  onThreadPatch?: (threadId: string, patch: Partial<InboxThread>) => void;
  onArchived?: () => void;
  onMovedOutOfQueue?: () => void;
  className?: string;
}

export function CommunicationsWorkspace({
  thread,
  messages,
  orgMembers = [],
  pageName = null,
  showBack,
  onBack,
  showAiPanel = true,
  onThreadPatch,
  onArchived,
  onMovedOutOfQueue,
  className,
}: CommunicationsWorkspaceProps) {
  const router = useRouter();
  const assignMenuId = useId();
  const [actionError, setActionError] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const pendingActionRef = useRef<string | null>(null);

  useEffect(() => {
    setAssignOpen(false);
    setActionError(null);
    pendingActionRef.current = null;
  }, [thread?.id]);

  useEffect(() => {
    if (!assignOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAssignOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [assignOpen]);

  const isArchived = thread?.status === "archived";
  const queueState = thread ? classifyThreadQueueState(thread, messages) : null;
  const isFollowUp = Boolean(thread?.followUp);
  const isDone = Boolean(queueState?.completed);
  const localAssignee = {
    assignedUserId: thread?.assignedUserId ?? null,
    assigneeName: thread?.assigneeName ?? null,
    assigneeInitials: thread?.assigneeInitials ?? null,
  };

  function handleFollowUpToggle() {
    if (!thread || pendingActionRef.current === "followUp") {
      return;
    }

    const previous = thread.followUp;
    const next = !previous;
    pendingActionRef.current = "followUp";
    setActionError(null);
    onThreadPatch?.(thread.id, { followUp: next });

    void toggleInboxThreadFollowUpAction({ threadId: thread.id }).then((result) => {
      pendingActionRef.current = null;
      if (!result.success) {
        onThreadPatch?.(thread.id, { followUp: previous });
        setActionError(result.error ?? "Could not update follow-up.");
        return;
      }
      router.refresh();
    });
  }

  function handleDoneToggle() {
    if (!thread || pendingActionRef.current === "done") {
      return;
    }

    const previousMarkedDone = thread.markedDone;
    const previousUnread = thread.unreadCount;
    const nextMarkedDone = !previousMarkedDone;
    pendingActionRef.current = "done";
    setActionError(null);
    onThreadPatch?.(thread.id, {
      markedDone: nextMarkedDone,
      ...(nextMarkedDone ? { unreadCount: 0 } : {}),
    });
    if (nextMarkedDone) {
      onMovedOutOfQueue?.();
    }

    void markInboxThreadDoneAction({ threadId: thread.id }).then((result) => {
      pendingActionRef.current = null;
      if (!result.success) {
        onThreadPatch?.(thread.id, {
          markedDone: previousMarkedDone,
          unreadCount: previousUnread,
        });
        setActionError(result.error ?? "Could not update conversation.");
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteToggle() {
    if (!thread || pendingActionRef.current === "delete") {
      return;
    }

    if (!isArchived) {
      const confirmed = window.confirm(
        "Delete this conversation? It will be removed from your active inbox.",
      );
      if (!confirmed) {
        return;
      }
    }

    const previousStatus = thread.status;
    const previousMarkedDone = thread.markedDone;
    const previousUnread = thread.unreadCount;
    const nextStatus = isArchived ? "pending" : "archived";
    pendingActionRef.current = "delete";
    setActionError(null);
    onThreadPatch?.(thread.id, {
      status: nextStatus,
      ...(nextStatus === "archived"
        ? { unreadCount: 0, markedDone: false }
        : { markedDone: false }),
    });
    if (!isArchived) {
      onArchived?.();
      onMovedOutOfQueue?.();
    }

    void (isArchived
      ? unarchiveInboxThreadAction({ threadId: thread.id })
      : archiveInboxThreadAction({ threadId: thread.id })
    ).then((result) => {
      pendingActionRef.current = null;
      if (!result.success) {
        onThreadPatch?.(thread.id, {
          status: previousStatus,
          markedDone: previousMarkedDone,
          unreadCount: previousUnread,
        });
        setActionError(
          result.error ??
            (isArchived
              ? "Could not restore conversation."
              : "Could not delete conversation."),
        );
        return;
      }
      router.refresh();
    });
  }

  function handleAssign(assignedUserId: string | null) {
    if (!thread || pendingActionRef.current === "assign") {
      return;
    }

    const member = assignedUserId
      ? orgMembers.find((entry) => entry.userId === assignedUserId)
      : null;
    const previous = {
      assignedUserId: thread.assignedUserId,
      assigneeName: thread.assigneeName,
      assigneeInitials: thread.assigneeInitials,
    };
    const next = {
      assignedUserId,
      assigneeName: member?.displayName ?? null,
      assigneeInitials: member?.initials ?? null,
    };

    setAssignOpen(false);
    setActionError(null);
    pendingActionRef.current = "assign";
    onThreadPatch?.(thread.id, next);

    void assignInboxThreadAction({
      threadId: thread.id,
      assignedUserId,
    }).then((result) => {
      pendingActionRef.current = null;
      if (!result.success) {
        onThreadPatch?.(thread.id, previous);
        setActionError(result.error ?? "Could not update assignment.");
        return;
      }
      router.refresh();
    });
  }

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
  const assignLabel = localAssignee.assigneeName?.trim() || "Assign";

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

          <InboxParticipantAvatar
            avatarUrl={thread.participantAvatarUrl}
            name={thread.participantName}
            className="h-10 w-10 text-xs"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-cos-text">{displayName}</p>
            <p className="mt-0.5 text-xs text-cos-muted">
              {threadChannelDisplayLabel(thread)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleFollowUpToggle}
              title="Follow up"
              aria-label={isFollowUp ? "Remove follow up" : "Follow up"}
              aria-pressed={isFollowUp}
              className={threadActionButtonClassName(isFollowUp)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFollowUp ? "text-[#f5c842]" : "text-cos-text",
                )}
                fill={isFollowUp ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={handleDoneToggle}
              title="Done"
              aria-label={thread.markedDone ? "Undo done" : "Done"}
              aria-pressed={isDone}
              className={threadActionButtonClassName(isDone)}
            >
              <Check
                className={cn("h-4 w-4", isDone ? "text-white" : "text-cos-text")}
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={handleDeleteToggle}
              title={isArchived ? "Restore" : "Delete"}
              aria-label={isArchived ? "Restore conversation" : "Delete"}
              className={threadActionButtonClassName(isArchived)}
            >
              <Trash2
                className={cn("h-4 w-4", isArchived ? "text-white" : "text-cos-text")}
                aria-hidden
              />
            </button>
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAssignOpen((open) => !open)}
                title={
                  localAssignee.assigneeName
                    ? `Assigned to ${localAssignee.assigneeName}`
                    : "Assign to team member"
                }
                aria-label={
                  localAssignee.assigneeName
                    ? `Assigned to ${localAssignee.assigneeName}. Change assignment`
                    : "Assign to team member"
                }
                aria-haspopup="menu"
                aria-expanded={assignOpen}
                aria-controls={assignMenuId}
                className={cn(
                  "inline-flex h-9 max-w-[11rem] items-center gap-1.5 rounded-2xl px-3 text-xs font-medium transition-all duration-200 disabled:opacity-60 disabled:hover:translate-y-0",
                  localAssignee.assignedUserId
                    ? threadActionActiveClassName
                    : threadActionIdleClassName,
                )}
              >
                {localAssignee.assigneeInitials ? (
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      localAssignee.assignedUserId
                        ? "bg-white/15 text-white"
                        : "bg-white/60 text-cos-muted",
                    )}
                    aria-hidden
                  >
                    {localAssignee.assigneeInitials}
                  </span>
                ) : (
                  <UserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="truncate">{assignLabel}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              </button>

              {assignOpen ? (
                <>
                  <button
                    type="button"
                    aria-label="Close assign menu"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setAssignOpen(false)}
                  />
                  <div
                    id={assignMenuId}
                    role="menu"
                    aria-label="Assign conversation"
                    className="absolute right-0 z-50 mt-1.5 w-56 rounded-xl border border-cos-border bg-cos-card p-1.5 shadow-lg"
                  >
                    {orgMembers.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-cos-muted">
                        No team members with login access yet.
                      </p>
                    ) : (
                      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleAssign(null)}
                            className={cn(
                              "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors",
                              !localAssignee.assignedUserId
                                ? "bg-cos-dark text-[#f6f2eb]"
                                : "text-cos-text hover:bg-cos-bg",
                            )}
                          >
                            Unassigned
                          </button>
                        </li>
                        {orgMembers.map((member) => {
                          const active = localAssignee.assignedUserId === member.userId;
                          return (
                            <li key={member.id} role="none">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleAssign(member.userId)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                  active
                                    ? "bg-cos-dark text-[#f6f2eb]"
                                    : "text-cos-text hover:bg-cos-bg",
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                    active
                                      ? "bg-white/15 text-white"
                                      : "bg-cos-bg text-cos-muted",
                                  )}
                                  aria-hidden
                                >
                                  {member.initials}
                                </span>
                                <span className="truncate">{member.displayName}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            {hasThreadPostPermalink(thread) ? (
              <InboxDirectPostLinkButton thread={thread} />
            ) : null}
            <InboxPlatformIcon channelType={thread.channelType} size="md" />
          </div>
        </div>

        {actionError ? (
          <p className="border-b border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700" role="alert">
            {actionError}
          </p>
        ) : null}

        {localAssignee.assigneeName ? (
          <div className="flex shrink-0 items-center gap-2 border-b border-cos-border bg-cos-bg px-5 py-2.5">
            <UserPlus className="h-3.5 w-3.5 shrink-0 text-cos-muted" aria-hidden />
            <p className="min-w-0 text-xs text-cos-text">
              <span className="text-cos-muted">This chat is assigned to: </span>
              <span className="font-semibold">{localAssignee.assigneeName}</span>
            </p>
          </div>
        ) : null}

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 pt-6 pb-5 scroll-pt-6">
          <ThreadMessageTimeline
            messages={messages}
            channelType={thread.channelType}
            participantName={thread.participantName}
            participantAvatarUrl={thread.participantAvatarUrl}
            pageAvatarUrl={thread.pageAvatarUrl}
            pageName={pageName}
          />

          {isTaggedChannel(thread.channelType) ? (
            <div className="mt-4 border-t border-cos-border pt-4">
              <InboxTaggedPanel thread={thread} />
            </div>
          ) : null}
        </div>

        {isReplyChannel(thread.channelType) && !isArchived ? (
          <div className="relative z-20 shrink-0 overflow-visible">
            <CommunicationsReplySection thread={thread} messages={messages} />
          </div>
        ) : null}
      </div>

      {showAiPanel ? (
        <CommunicationsAiPanel
          thread={thread}
          messages={messages}
          pageName={pageName}
          className="hidden xl:flex"
        />
      ) : null}
    </div>
  );
}
