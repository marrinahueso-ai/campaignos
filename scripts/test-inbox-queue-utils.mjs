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
  const isArchived = thread.status === "archived";
  const followUp = Boolean(thread.followUp) && !isArchived;
  const completed = Boolean(thread.markedDone) && !isArchived;
  const unread = !isArchived && !thread.markedDone;

  const replyTarget = resolveInboxReplyTarget({
    channelType: thread.channelType,
    messages,
  });

  if (!isReplyChannel(thread.channelType)) {
    const needsReply = unread && !completed && thread.status === "pending";
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

function computeQueueCounts(threads, messagesByThreadId) {
  const counts = {
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

function filterThreadsForCommunicationsHub({
  threads,
  messagesByThreadId,
  queueFilter,
}) {
  return threads.filter((thread) => {
    const messages = messagesByThreadId[thread.id] ?? [];
    const state = classifyThreadQueueState(thread, messages);
    switch (queueFilter) {
      case "unread":
        return state.unread;
      case "follow_up":
        return state.followUp;
      case "completed":
        return state.completed;
      case "archived":
        return thread.status === "archived";
      case "waiting_on_ai":
        return thread.status !== "archived" && state.waitingOnAi;
      default:
        return false;
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
  followUp: false,
  markedDone: false,
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
assert(waitingState.unread === true, "expected unread inbox membership");

const approvedState = classifyThreadQueueState(thread, [
  {
    ...message,
    status: "approved",
    approvedBody: "Here is SACC info.",
    aiDraftBody: "Here is SACC info.",
  },
]);
assert(approvedState.readyToSend === true, "expected readyToSend");
assert(approvedState.unread === true, "approved stays in Unread until Done");

const markedDoneState = classifyThreadQueueState(
  { ...thread, markedDone: true, unreadCount: 0 },
  [message],
);
assert(markedDoneState.completed === true, "expected completed from markedDone");
assert(markedDoneState.unread === false, "Done leaves Unread");

const followUpState = classifyThreadQueueState(
  { ...thread, followUp: true },
  [message],
);
assert(followUpState.followUp === true, "expected followUp");
assert(followUpState.unread === true, "follow-up stays in Unread");

const counts = computeQueueCounts(
  [
    thread,
    {
      id: "thread-2",
      channelType: "facebook_message",
      unreadCount: 0,
      status: "sent",
      followUp: false,
      markedDone: true,
    },
    {
      id: "thread-3",
      channelType: "facebook_message",
      unreadCount: 0,
      status: "archived",
      followUp: false,
      markedDone: false,
    },
    {
      id: "thread-4",
      channelType: "facebook_message",
      unreadCount: 0,
      status: "pending",
      followUp: true,
      markedDone: false,
    },
  ],
  {
    "thread-1": [message],
    "thread-2": [{ ...message, id: "msg-2", threadId: "thread-2", status: "sent" }],
    "thread-3": [{ ...message, id: "msg-3", threadId: "thread-3", status: "pending" }],
    "thread-4": [{ ...message, id: "msg-4", threadId: "thread-4", status: "pending" }],
  },
);
assert(counts.needsReply === 2, "expected two needsReply (thread-1 + follow-up)");
assert(counts.unread === 2, "expected two unread (active non-done)");
assert(counts.followUp === 1, "expected one followUp");
assert(counts.completed === 1, "expected one completed (markedDone)");
assert(counts.archived === 1, "expected one archived");

const unreadOnly = filterThreadsForCommunicationsHub({
  threads: [
    thread,
    {
      id: "thread-2",
      channelType: "facebook_message",
      unreadCount: 0,
      status: "sent",
      followUp: false,
      markedDone: true,
    },
    {
      id: "thread-3",
      channelType: "facebook_message",
      unreadCount: 0,
      status: "archived",
      followUp: false,
      markedDone: false,
    },
  ],
  messagesByThreadId: {
    "thread-1": [message],
    "thread-2": [{ ...message, id: "msg-2", threadId: "thread-2", status: "sent" }],
    "thread-3": [message],
  },
  queueFilter: "unread",
});
assert(unreadOnly.length === 1, "Unread excludes Done and Deleted");
assert(unreadOnly[0].id === "thread-1", "expected active non-done thread only");

const reopenedAfterSend = classifyThreadQueueState(
  { ...thread, status: "sent", unreadCount: 1, markedDone: false },
  [message],
);
assert(
  reopenedAfterSend.needsReply === true,
  "sent thread with new pending inbound should need reply",
);
assert(reopenedAfterSend.unread === true, "reopened thread stays in Unread");

console.log("OK: inbox queue utils smoke tests passed");
