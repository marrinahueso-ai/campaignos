#!/usr/bin/env node
/**
 * Smoke tests for Communications Hub thread timeline message filtering.
 * Run: node scripts/test-inbox-timeline-messages.mjs
 */

function isCommentChannel(channelType) {
  return channelType === "instagram_comment" || channelType === "facebook_comment";
}

function isTaggedChannel(channelType) {
  return channelType === "instagram_tag" || channelType === "facebook_tag";
}

function shouldShowInThreadTimeline(message, channelType) {
  if (message.direction === "inbound") {
    return true;
  }

  if (message.direction === "outbound" && message.status === "sent") {
    return true;
  }

  if (
    (isCommentChannel(channelType) || isTaggedChannel(channelType)) &&
    message.direction === "outbound" &&
    Boolean(message.body?.trim())
  ) {
    return true;
  }

  return false;
}

function isHubSentCommentReply(message) {
  const replyTo = message.metadata?.replyToMessageId;
  if (typeof replyTo === "string" && replyTo.trim()) {
    return true;
  }

  if (
    message.externalSendId &&
    message.externalMessageId === message.externalSendId
  ) {
    return true;
  }

  return (
    Boolean(message.sentToPlatformAt) &&
    String(message.externalMessageId).startsWith("local:")
  );
}

function isOutboundTimelineMessage(message, context) {
  if (message.direction !== "outbound" || message.status !== "sent") {
    return false;
  }

  if (
    isCommentChannel(message.channelType) ||
    isTaggedChannel(message.channelType)
  ) {
    if (context?.seedMessageId && message.id === context.seedMessageId) {
      return false;
    }

    if (context?.seedMessageId && message.id !== context.seedMessageId) {
      return true;
    }

    return isHubSentCommentReply(message);
  }

  return true;
}

function deriveAiConfidenceScore(aiSourceUsed) {
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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const outboundPendingComment = {
  id: "msg-1",
  channelType: "facebook_comment",
  direction: "outbound",
  status: "pending",
  body: "can you tell me what time the kids get out of school",
  externalMessageId: "comment-seed",
  externalSendId: null,
  metadata: {},
};

assert(
  shouldShowInThreadTimeline(outboundPendingComment, "facebook_comment") === true,
  "outbound pending facebook comment seed should show in timeline",
);
assert(
  shouldShowInThreadTimeline(outboundPendingComment, "facebook_message") === false,
  "outbound pending DM should not show until sent",
);
assert(
  isOutboundTimelineMessage(outboundPendingComment) === false,
  "pending comment seed should left-align (not treat as sent reply)",
);

const sentSeedAfterReply = {
  id: "msg-1b",
  channelType: "facebook_comment",
  direction: "outbound",
  status: "sent",
  body: "can you tell me what time the kids get out of school",
  externalMessageId: "comment-seed",
  externalSendId: "reply-external-id",
  sentToPlatformAt: "2026-07-22T00:00:00.000Z",
  metadata: {},
};
assert(
  isOutboundTimelineMessage(sentSeedAfterReply, { seedMessageId: "msg-1b" }) === false,
  "comment seed marked sent after reply must stay inbound-styled",
);

const sentReplyMissingMeta = {
  id: "msg-2",
  channelType: "facebook_comment",
  direction: "outbound",
  status: "sent",
  body: "School lets out at 1pm today!",
  externalMessageId: "reply-external-id",
  externalSendId: null,
  sentToPlatformAt: "2026-07-22T00:00:00.000Z",
  metadata: {},
};
assert(
  shouldShowInThreadTimeline(sentReplyMissingMeta, "facebook_comment") === true,
  "sent outbound reply should show",
);
assert(
  isOutboundTimelineMessage(sentReplyMissingMeta, { seedMessageId: "msg-1b" }) === true,
  "non-seed outbound sent reply should right-align even without replyToMessageId",
);

const sentDm = {
  id: "msg-dm",
  channelType: "facebook_message",
  direction: "outbound",
  status: "sent",
  body: "Thanks for messaging us!",
  externalMessageId: "dm-1",
  externalSendId: "dm-1",
  metadata: {},
};
assert(
  isOutboundTimelineMessage(sentDm) === true,
  "sent DM outbound should still right-align without replyToMessageId",
);

const inbound = {
  id: "msg-3",
  channelType: "facebook_message",
  direction: "inbound",
  status: "pending",
  body: "Hello",
  externalMessageId: "in-1",
  metadata: {},
};
assert(shouldShowInThreadTimeline(inbound, "facebook_message") === true, "inbound always shows");

assert(deriveAiConfidenceScore(null) === null, "no AI source => no fake confidence");
assert(
  deriveAiConfidenceScore({ answerFrom: { label: "FAQ", url: "https://x.test" } }) === 96,
  "matched source => high confidence",
);
assert(
  deriveAiConfidenceScore({ answerFrom: null, noAnswerFound: true, sourcesChecked: [] }) === 42,
  "no answer => low confidence",
);

console.log("OK: inbox timeline messages smoke tests passed");
