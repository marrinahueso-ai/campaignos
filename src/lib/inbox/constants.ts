import type { InboxChannelType } from "@/lib/inbox/types";

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
  instagram_dm: "Instagram DMs",
  facebook_message: "Facebook messages",
  instagram_comment: "Instagram comments",
  facebook_comment: "Facebook comments",
  instagram_tag: "Instagram tagged",
  facebook_tag: "Facebook tagged",
};

export const INBOX_CHANNEL_SHORT_LABELS: Record<InboxChannelType, string> = {
  instagram_dm: "IG DMs",
  facebook_message: "FB messages",
  instagram_comment: "IG comments",
  facebook_comment: "FB comments",
  instagram_tag: "IG tagged",
  facebook_tag: "FB tagged",
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
