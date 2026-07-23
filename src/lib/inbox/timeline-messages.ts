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

/** Sent page replies align right; everything else (including comment seeds) aligns left. */
export function isOutboundTimelineMessage(message: InboxMessage): boolean {
  return message.direction === "outbound" && message.status === "sent";
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
