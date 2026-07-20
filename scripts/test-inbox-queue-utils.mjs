#!/usr/bin/env node
/**
 * Smoke tests for Communications Hub queue classification.
 * Run: node scripts/test-inbox-queue-utils.mjs
 */

const REPLY_CHANNELS = new Set([
  "instagram_dm",
  "facebook_message",
  "instagram_comment",
  "facebook_comment",
]);

function isReplyChannel(channelType) {
  return REPLY_CHANNELS.has(channelType);
}

function isPendingReply(message) {
  return message.status !== "sent" && message.status !== "archived";
}

function sortBySentAt(messages) {
  return [...messages].sort((left, right) => {
    const leftTime = left.sentAt ? Date.parse(left.sentAt) : 0;
    const rightTime = right.sentAt ? Date.parse(right.sentAt) : 0;
    return leftTime - rightTime;
  });
}

function resolveInboxReplyTarget({ channelType, messages }) {
  if (messages.length === 0) {
    return null;
  }

  const inbound = sortBySentAt(messages.filter((message) => message.direction === "inbound"));
  const pendingInbound = inbound.find(isPendingReply);
  if (pendingInbound) {
    return pendingInbound;
  }

  if (inbound.length > 0) {
    return inbound[inbound.length - 1] ?? null;
  }

  const ordered = sortBySentAt(messages);
  const pending = ordered.find(isPendingReply);
  return pending ?? ordered[ordered.length - 1] ?? null;
}

function classifyThreadQueueState(thread, messages) {
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

function computeQueueCounts(threads, messagesByThreadId) {
  const counts = {
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

function filterThreadsForCommunicationsHub({
  threads,
  messagesByThreadId,
  queueFilter,
}) {
  return threads.filter((thread) => {
    const messages = messagesByThreadId[thread.id] ?? [];
    const state = classifyThreadQueueState(thread, messages);
    switch (queueFilter) {
      case "all":
        return thread.status !== "archived";
      case "archived":
        return thread.status === "archived";
      case "completed":
        return thread.status !== "archived" && state.completed;
      case "needs_reply":
        return thread.status !== "archived" && state.needsReply;
      default:
        return true;
    }
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const thread = {
  id: "thread-1",
  channelType: "facebook_message",
  unreadCount: 1,
  status: "pending",
};

const message = {
  id: "msg-1",
  threadId: "thread-1",
  direction: "inbound",
  body: "Do you have info on SACC?",
  sentAt: "2026-07-11T12:00:00.000Z",
  status: "pending",
  aiDraftBody: null,
  approvedBody: null,
};

const waitingState = classifyThreadQueueState(thread, [message]);
assert(waitingState.needsReply === true, "expected needsReply");
assert(waitingState.waitingOnAi === true, "expected waitingOnAi");

const approvedState = classifyThreadQueueState(thread, [
  {
    ...message,
    status: "approved",
    approvedBody: "Here is SACC info.",
    aiDraftBody: "Here is SACC info.",
  },
]);
assert(approvedState.readyToSend === true, "expected readyToSend");

const counts = computeQueueCounts(
  [
    thread,
    { id: "thread-2", channelType: "facebook_message", unreadCount: 0, status: "sent" },
    { id: "thread-3", channelType: "facebook_message", unreadCount: 0, status: "archived" },
  ],
  {
    "thread-1": [message],
    "thread-2": [{ ...message, id: "msg-2", threadId: "thread-2", status: "sent" }],
    "thread-3": [{ ...message, id: "msg-3", threadId: "thread-3", status: "pending" }],
  },
);
assert(counts.needsReply === 1, "expected one needsReply");
assert(counts.completed === 1, "expected one completed");
assert(counts.archived === 1, "expected one archived");

const activeOnly = filterThreadsForCommunicationsHub({
  threads: [
    thread,
    { id: "thread-3", channelType: "facebook_message", unreadCount: 0, status: "archived" },
  ],
  messagesByThreadId: {
    "thread-1": [message],
    "thread-3": [message],
  },
  queueFilter: "all",
});
assert(activeOnly.length === 1, "all conversations should exclude archived");
assert(activeOnly[0].id === "thread-1", "expected active thread only");

const reopenedAfterSend = classifyThreadQueueState(
  { ...thread, status: "sent", unreadCount: 1 },
  [message],
);
assert(
  reopenedAfterSend.needsReply === true,
  "sent thread with new pending inbound should need reply",
);

console.log("OK: inbox queue utils smoke tests passed");
