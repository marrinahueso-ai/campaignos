"use client";

import { useEffect, useId, useState, useTransition } from "react";
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
            initials={participantInitials(avatarName)}
          />
        );
      })}
    </ul>
  );
}

const threadActionButtonClassName =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cos-border bg-white text-cos-text transition-colors hover:bg-cos-bg disabled:opacity-60";

interface CommunicationsWorkspaceProps {
  thread: InboxThread | null;
  messages: InboxMessage[];
  orgMembers?: InboxOrgMember[];
  pageName?: string | null;
  showBack?: boolean;
  onBack?: () => void;
  showAiPanel?: boolean;
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
  onArchived,
  onMovedOutOfQueue,
  className,
}: CommunicationsWorkspaceProps) {
  const router = useRouter();
  const assignMenuId = useId();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActing, startActionTransition] = useTransition();
  const [assignOpen, setAssignOpen] = useState(false);
  const [localAssignee, setLocalAssignee] = useState<{
    assignedUserId: string | null;
    assigneeName: string | null;
    assigneeInitials: string | null;
  }>({
    assignedUserId: thread?.assignedUserId ?? null,
    assigneeName: thread?.assigneeName ?? null,
    assigneeInitials: thread?.assigneeInitials ?? null,
  });

  useEffect(() => {
    setLocalAssignee({
      assignedUserId: thread?.assignedUserId ?? null,
      assigneeName: thread?.assigneeName ?? null,
      assigneeInitials: thread?.assigneeInitials ?? null,
    });
    setAssignOpen(false);
  }, [
    thread?.id,
    thread?.assignedUserId,
    thread?.assigneeName,
    thread?.assigneeInitials,
  ]);

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

  function handleFollowUpToggle() {
    if (!thread) {
      return;
    }
    setActionError(null);
    startActionTransition(async () => {
      const result = await toggleInboxThreadFollowUpAction({ threadId: thread.id });
      if (!result.success) {
        setActionError(result.error ?? "Could not update follow-up.");
        return;
      }
      router.refresh();
    });
  }

  function handleDoneToggle() {
    if (!thread) {
      return;
    }
    setActionError(null);
    startActionTransition(async () => {
      const result = await markInboxThreadDoneAction({ threadId: thread.id });
      if (!result.success) {
        setActionError(result.error ?? "Could not update conversation.");
        return;
      }
      if (!thread.markedDone) {
        onMovedOutOfQueue?.();
      }
      router.refresh();
    });
  }

  function handleDeleteToggle() {
    if (!thread) {
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

    setActionError(null);
    startActionTransition(async () => {
      const result = isArchived
        ? await unarchiveInboxThreadAction({ threadId: thread.id })
        : await archiveInboxThreadAction({ threadId: thread.id });

      if (!result.success) {
        setActionError(
          result.error ??
            (isArchived
              ? "Could not restore conversation."
              : "Could not delete conversation."),
        );
        return;
      }

      if (!isArchived) {
        onArchived?.();
        onMovedOutOfQueue?.();
      }
      router.refresh();
    });
  }

  function handleAssign(assignedUserId: string | null) {
    if (!thread) {
      return;
    }

    const member = assignedUserId
      ? orgMembers.find((entry) => entry.userId === assignedUserId)
      : null;
    const next = {
      assignedUserId,
      assigneeName: member?.displayName ?? null,
      assigneeInitials: member?.initials ?? null,
    };

    setAssignOpen(false);
    setActionError(null);
    setLocalAssignee(next);
    startActionTransition(async () => {
      const result = await assignInboxThreadAction({
        threadId: thread.id,
        assignedUserId,
      });
      if (!result.success) {
        setLocalAssignee({
          assignedUserId: thread.assignedUserId,
          assigneeName: thread.assigneeName,
          assigneeInitials: thread.assigneeInitials,
        });
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
            <button
              type="button"
              onClick={handleFollowUpToggle}
              disabled={isActing}
              title="Follow up"
              aria-label={isFollowUp ? "Remove follow up" : "Follow up"}
              aria-pressed={isFollowUp}
              className={threadActionButtonClassName}
            >
              <Star
                className={cn("h-4 w-4", isFollowUp ? "text-[#f59e0b]" : "text-cos-text")}
                fill={isFollowUp ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={handleDoneToggle}
              disabled={isActing}
              title="Done"
              aria-label={thread.markedDone ? "Undo done" : "Done"}
              aria-pressed={isDone}
              className={threadActionButtonClassName}
            >
              <Check
                className={cn("h-4 w-4", isDone ? "text-emerald-700" : "text-cos-text")}
                strokeWidth={2.25}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={handleDeleteToggle}
              disabled={isActing}
              title={isArchived ? "Restore" : "Delete"}
              aria-label={isArchived ? "Restore conversation" : "Delete"}
              className={threadActionButtonClassName}
            >
              <Trash2 className="h-4 w-4 text-cos-text" aria-hidden />
            </button>
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setAssignOpen((open) => !open)}
                disabled={isActing}
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
                  "inline-flex h-9 max-w-[11rem] items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                  localAssignee.assignedUserId
                    ? "border-cos-dark bg-cos-dark text-[#f6f2eb]"
                    : "border-cos-border bg-cos-card text-cos-text hover:border-cos-dark hover:bg-cos-bg",
                )}
              >
                {localAssignee.assigneeInitials ? (
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      localAssignee.assignedUserId
                        ? "bg-white/15 text-white"
                        : "bg-cos-bg text-cos-muted",
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
