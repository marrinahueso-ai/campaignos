import type { InboxChannelType } from "@/lib/inbox/types";

/** Thread list page size for Communications Hub. */
export const INBOX_THREAD_FETCH_CAP = 50;

/** Max messages loaded per thread on initial page (newest kept). */
export const INBOX_MESSAGES_PER_THREAD_CAP = 40;

/** Hard ceiling on messages fetched before per-thread trim. */
export const INBOX_MESSAGES_FETCH_CAP =
  INBOX_THREAD_FETCH_CAP * INBOX_MESSAGES_PER_THREAD_CAP;

/** Unread badge: max thread rows to sum (avoids scanning entire org inbox). */
export const INBOX_UNREAD_BADGE_THREAD_CAP = 500;

export const INBOX_CHANNEL_TYPES: InboxChannelType[] = [
  "instagram_dm",
  "facebook_message",
  "instagram_comment",
  "facebook_comment",
  "instagram_tag",
  "facebook_tag",
];

export const INBOX_REPLY_CHANNEL_TYPES: InboxChannelType[] = [
  "instagram_dm",
  "facebook_message",
  "instagram_comment",
  "facebook_comment",
];

export const INBOX_TAG_CHANNEL_TYPES: InboxChannelType[] = [
  "instagram_tag",
  "facebook_tag",
];

export const INBOX_CHANNEL_LABELS: Record<InboxChannelType, string> = {
  instagram_dm: "Instagram Message",
  facebook_message: "Facebook Message",
  instagram_comment: "Instagram Comment",
  facebook_comment: "Facebook Comment",
  instagram_tag: "Instagram Tag",
  facebook_tag: "Facebook Tag",
};

export const INBOX_CHANNEL_SHORT_LABELS: Record<InboxChannelType, string> = {
  instagram_dm: "IG Message",
  facebook_message: "FB Message",
  instagram_comment: "IG Comment",
  facebook_comment: "FB Comment",
  instagram_tag: "IG Tag",
  facebook_tag: "FB Tag",
};

export function isCommentChannel(channelType: InboxChannelType): boolean {
  return channelType === "instagram_comment" || channelType === "facebook_comment";
}

export function isDmChannel(channelType: InboxChannelType): boolean {
  return channelType === "instagram_dm" || channelType === "facebook_message";
}

export function isTaggedChannel(channelType: InboxChannelType): boolean {
  return channelType === "instagram_tag" || channelType === "facebook_tag";
}

export function isReplyChannel(channelType: InboxChannelType): boolean {
  return INBOX_REPLY_CHANNEL_TYPES.includes(channelType);
}

export function isTaggedFilter(
  filter: "all" | "tagged" | InboxChannelType,
): filter is "tagged" {
  return filter === "tagged";
}

export type InboxPlatform = "facebook" | "instagram";

export function getInboxPlatform(channelType: InboxChannelType): InboxPlatform {
  return channelType.startsWith("instagram") ? "instagram" : "facebook";
}

export function isInstagramChannel(channelType: InboxChannelType): boolean {
  return getInboxPlatform(channelType) === "instagram";
}

export function isFacebookChannel(channelType: InboxChannelType): boolean {
  return getInboxPlatform(channelType) === "facebook";
}
