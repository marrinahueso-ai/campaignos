import { isCommentChannel, isTaggedChannel } from "@/lib/inbox/constants";
import type { InboxChannelType, InboxMessage } from "@/lib/inbox/types";

/**
 * Messages shown as chat bubbles in the thread pane.
 *
 * Comment/tag seeds can be stored as outbound+pending when Meta reports the
 * Page as the author (common when commenting as the Page during testing, or
 * when Graph returns the Page id). Those still need to appear as bubbles.
 */
export function shouldShowInThreadTimeline(
  message: InboxMessage,
  channelType: InboxChannelType,
): boolean {
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

/**
 * True page replies we sent from the hub (not the public's seed comment).
 *
 * After approve/send we flip the seed's status to "sent" and may copy
 * external_send_id onto it — so status alone cannot distinguish seed vs reply.
 */
function isHubSentCommentReply(message: InboxMessage): boolean {
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
    message.externalMessageId.startsWith("local:")
  );
}

export type OutboundTimelineContext = {
  /** Earliest timeline message id for comment/tag threads (the public seed). */
  seedMessageId?: string | null;
};

/**
 * Sent page replies align right; everything else (including comment seeds)
 * aligns left — even when Meta mis-attributes the Page as author and the seed
 * later gets status "sent" after we reply.
 */
export function isOutboundTimelineMessage(
  message: InboxMessage,
  context?: OutboundTimelineContext,
): boolean {
  if (message.direction !== "outbound" || message.status !== "sent") {
    return false;
  }

  if (
    isCommentChannel(message.channelType) ||
    isTaggedChannel(message.channelType)
  ) {
    // Chronological seed is always the inbound-styled question.
    if (context?.seedMessageId && message.id === context.seedMessageId) {
      return false;
    }

    // Later outbound+sent bubbles on the same comment thread are page replies,
    // even when metadata.replyToMessageId is missing on older rows.
    if (context?.seedMessageId && message.id !== context.seedMessageId) {
      return true;
    }

    return isHubSentCommentReply(message);
  }

  return true;
}

export function sortTimelineMessages(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = Date.parse(left.sentAt ?? left.createdAt);
    const rightTime = Date.parse(right.sentAt ?? right.createdAt);
    return leftTime - rightTime;
  });
}

export function getTimelineMessages(
  messages: InboxMessage[],
  channelType: InboxChannelType,
): InboxMessage[] {
  return sortTimelineMessages(
    messages.filter((message) => shouldShowInThreadTimeline(message, channelType)),
  );
}
