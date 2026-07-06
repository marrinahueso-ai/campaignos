import type { InboxChannelType } from "@/lib/inbox/types";

export const INBOX_CHANNEL_TYPES: InboxChannelType[] = [
  "instagram_dm",
  "facebook_message",
  "instagram_comment",
  "facebook_comment",
];

export const INBOX_CHANNEL_LABELS: Record<InboxChannelType, string> = {
  instagram_dm: "Instagram DMs",
  facebook_message: "Facebook messages",
  instagram_comment: "Instagram comments",
  facebook_comment: "Facebook comments",
};

export const INBOX_CHANNEL_SHORT_LABELS: Record<InboxChannelType, string> = {
  instagram_dm: "IG DMs",
  facebook_message: "FB messages",
  instagram_comment: "IG comments",
  facebook_comment: "FB comments",
};
