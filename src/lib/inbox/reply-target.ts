import { isCommentChannel } from "@/lib/inbox/constants";
import type { InboxChannelType, InboxMessage } from "@/lib/inbox/types";

function isPendingReply(message: InboxMessage): boolean {
  return message.status !== "sent" && message.status !== "archived";
}

function sortBySentAt(messages: InboxMessage[]): InboxMessage[] {
  return [...messages].sort((left, right) => {
    const leftTime = left.sentAt ? Date.parse(left.sentAt) : 0;
    const rightTime = right.sentAt ? Date.parse(right.sentAt) : 0;
    return leftTime - rightTime;
  });
}

export function resolveInboxReplyTarget(input: {
  channelType: InboxChannelType;
  messages: InboxMessage[];
}): InboxMessage | null {
  if (input.messages.length === 0) {
    return null;
  }

  const inbound = sortBySentAt(
    input.messages.filter((message) => message.direction === "inbound"),
  );
  const pendingInbound = inbound.find(isPendingReply);
  if (pendingInbound) {
    return pendingInbound;
  }

  if (inbound.length > 0) {
    return inbound[inbound.length - 1] ?? null;
  }

  if (!isCommentChannel(input.channelType)) {
    return null;
  }

  // No inbound rows (e.g. Meta attributed the Page as author). Prefer a pending
  // seed, otherwise the chronologically first message — not a later page reply.
  const ordered = sortBySentAt(input.messages);
  const pending = ordered.find(isPendingReply);
  return pending ?? ordered[0] ?? null;
}

export function canApproveReplyAnchor(input: {
  channelType: InboxChannelType;
  message: InboxMessage;
}): boolean {
  if (input.message.direction === "inbound") {
    return true;
  }

  return isCommentChannel(input.channelType);
}
