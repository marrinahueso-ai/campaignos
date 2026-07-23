import { isReplyChannel } from "@/lib/inbox/constants";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";

/** Primary inbox folders + Deleted; waiting_on_ai is TopBar AI Queue only. */
export type CommunicationsQueueFilter =
  | "unread"
  | "follow_up"
  | "completed"
  | "archived"
  | "waiting_on_ai";

export interface CommunicationsQueueCounts {
  needsReply: number;
  unread: number;
  waitingOnAi: number;
  readyToSend: number;
  followUp: number;
  completed: number;
  archived: number;
}

export interface ThreadQueueState {
  /** Active inbox home: not deleted and not marked done (includes follow-up). */
  unread: boolean;
  needsReply: boolean;
  waitingOnAi: boolean;
  readyToSend: boolean;
  followUp: boolean;
  /** Manually marked done (Check action) — Done folder. */
  completed: boolean;
}

export function classifyThreadQueueState(
  thread: InboxThread,
  messages: InboxMessage[],
): ThreadQueueState {
  const isArchived = thread.status === "archived";
  const followUp = thread.followUp && !isArchived;
  const completed = Boolean(thread.markedDone) && !isArchived;
  // Unread = default home for everything that isn't Done or Deleted.
  const unread = !isArchived && !thread.markedDone;

  const replyTarget = resolveInboxReplyTarget({
    channelType: thread.channelType,
    messages,
  });

  if (!isReplyChannel(thread.channelType)) {
    const needsReply =
      unread && !completed && thread.status === "pending";
    return {
      needsReply,
      unread,
      waitingOnAi: false,
      readyToSend: false,
      followUp,
      completed,
    };
  }

  if (!replyTarget) {
    return {
      needsReply: false,
      unread,
      waitingOnAi: false,
      readyToSend: false,
      followUp,
      completed,
    };
  }

  // Manual Done (marked_done) still wins until a new inbound clears it.
  // Sent/approved reply status drives AI workflow labels, not the Done folder.
  const replySettled =
    replyTarget.status === "sent" || replyTarget.status === "archived";
  const needsReply =
    unread && !completed && !replySettled && replyTarget.status === "pending";
  const waitingOnAi =
    needsReply && !replyTarget.aiDraftBody?.trim() && !replyTarget.approvedBody?.trim();
  const readyToSend =
    unread && !completed && replyTarget.status === "approved";

  return {
    needsReply,
    unread,
    waitingOnAi,
    readyToSend,
    followUp,
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
    followUp: 0,
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
    if (state.followUp) counts.followUp += 1;
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
      case "unread":
        // Active home: not deleted, not marked done (follow-up stays here).
        return state.unread;
      case "waiting_on_ai":
        return thread.status !== "archived" && state.waitingOnAi;
      case "follow_up":
        // Starred threads, including those also marked done.
        return state.followUp;
      case "completed":
        return state.completed;
      case "archived":
        return thread.status === "archived";
    }
  });
}

/** Default inbox home is always Unread. */
export function pickDefaultQueueFilter(): "unread" {
  return "unread";
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
