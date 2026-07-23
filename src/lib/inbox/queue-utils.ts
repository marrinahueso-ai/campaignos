import { isReplyChannel } from "@/lib/inbox/constants";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";

export type CommunicationsQueueFilter =
  | "all"
  | "needs_reply"
  | "unread"
  | "waiting_on_ai"
  | "ready_to_send"
  | "assigned_to_me"
  | "completed"
  | "archived";

export interface CommunicationsQueueCounts {
  needsReply: number;
  unread: number;
  waitingOnAi: number;
  readyToSend: number;
  assignedToMe: number;
  completed: number;
  archived: number;
}

export interface ThreadQueueState {
  needsReply: boolean;
  unread: boolean;
  waitingOnAi: boolean;
  readyToSend: boolean;
  completed: boolean;
}

export function classifyThreadQueueState(
  thread: InboxThread,
  messages: InboxMessage[],
): ThreadQueueState {
  const unread = thread.unreadCount > 0;
  const replyTarget = resolveInboxReplyTarget({
    channelType: thread.channelType,
    messages,
  });

  if (!isReplyChannel(thread.channelType)) {
    const completed = thread.status === "sent" || thread.status === "archived";
    const needsReply = !completed && thread.status === "pending";
    return {
      needsReply,
      unread,
      waitingOnAi: false,
      readyToSend: false,
      completed,
    };
  }

  if (!replyTarget) {
    const completed = thread.status === "sent" || thread.status === "archived";
    return {
      needsReply: false,
      unread,
      waitingOnAi: false,
      readyToSend: false,
      completed,
    };
  }

  // Prefer message-level completion. Do not keep a thread "completed" after
  // send just because thread.status is still "sent" when a newer inbound is pending.
  const completed =
    thread.status === "archived" ||
    replyTarget.status === "sent" ||
    replyTarget.status === "archived";

  const needsReply = !completed && replyTarget.status === "pending";
  const waitingOnAi =
    needsReply && !replyTarget.aiDraftBody?.trim() && !replyTarget.approvedBody?.trim();
  const readyToSend = !completed && replyTarget.status === "approved";

  return {
    needsReply,
    unread,
    waitingOnAi,
    readyToSend,
    completed,
  };
}

export function computeQueueCounts(
  threads: InboxThread[],
  messagesByThreadId: Record<string, InboxMessage[]>,
): CommunicationsQueueCounts {
  const counts: CommunicationsQueueCounts = {
    needsReply: 0,
    unread: 0,
    waitingOnAi: 0,
    readyToSend: 0,
    assignedToMe: 0,
    completed: 0,
    archived: 0,
  };

  for (const thread of threads) {
    if (thread.status === "archived") {
      counts.archived += 1;
      continue;
    }
    const messages = messagesByThreadId[thread.id] ?? [];
    const state = classifyThreadQueueState(thread, messages);
    if (state.needsReply) counts.needsReply += 1;
    if (state.unread) counts.unread += 1;
    if (state.waitingOnAi) counts.waitingOnAi += 1;
    if (state.readyToSend) counts.readyToSend += 1;
    if (state.completed) counts.completed += 1;
  }

  return counts;
}

function matchesSearch(thread: InboxThread, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    thread.participantName,
    thread.lastMessageSnippet,
    thread.subject,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function matchesChannelFilter(
  thread: InboxThread,
  channelFilter: "all" | InboxChannelType,
): boolean {
  if (channelFilter === "all") {
    return true;
  }
  return thread.channelType === channelFilter;
}

export function filterThreadsForCommunicationsHub(input: {
  threads: InboxThread[];
  messagesByThreadId: Record<string, InboxMessage[]>;
  queueFilter: CommunicationsQueueFilter;
  searchQuery: string;
  channelFilter: "all" | InboxChannelType;
}): InboxThread[] {
  return input.threads.filter((thread) => {
    if (!matchesSearch(thread, input.searchQuery)) {
      return false;
    }
    if (!matchesChannelFilter(thread, input.channelFilter)) {
      return false;
    }

    const messages = input.messagesByThreadId[thread.id] ?? [];
    const state = classifyThreadQueueState(thread, messages);

    switch (input.queueFilter) {
      case "all":
        // Active inbox only — archived conversations live under Archived.
        return thread.status !== "archived";
      case "needs_reply":
        return thread.status !== "archived" && state.needsReply;
      case "unread":
        return thread.status !== "archived" && state.unread;
      case "waiting_on_ai":
        return thread.status !== "archived" && state.waitingOnAi;
      case "ready_to_send":
        return thread.status !== "archived" && state.readyToSend;
      case "assigned_to_me":
        return false;
      case "completed":
        return thread.status !== "archived" && state.completed;
      case "archived":
        return thread.status === "archived";
    }
  });
}

export function pickDefaultQueueFilter(
  totalThreads: number,
  counts: CommunicationsQueueCounts,
): "all" | "needs_reply" {
  return counts.needsReply >= totalThreads ? "needs_reply" : "all";
}

/** Returns null when no AI draft/source check has run yet (do not invent a score). */
export function deriveAiConfidenceScore(
  aiSourceUsed: InboxMessage["aiSourceUsed"],
): number | null {
  if (!aiSourceUsed) {
    return null;
  }
  if (aiSourceUsed.answerFrom) {
    return 96;
  }
  if (aiSourceUsed.noAnswerFound) {
    return 42;
  }
  return 68;
}
