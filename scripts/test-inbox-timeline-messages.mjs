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

function isOutboundTimelineMessage(message) {
  return message.direction === "outbound" && message.status === "sent";
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
  direction: "outbound",
  status: "pending",
  body: "can you tell me what time the kids get out of school",
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

const sentReply = {
  id: "msg-2",
  direction: "outbound",
  status: "sent",
  body: "School lets out at 1pm today!",
};
assert(
  shouldShowInThreadTimeline(sentReply, "facebook_comment") === true,
  "sent outbound reply should show",
);
assert(isOutboundTimelineMessage(sentReply) === true, "sent reply should right-align");

const inbound = {
  id: "msg-3",
  direction: "inbound",
  status: "pending",
  body: "Hello",
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
