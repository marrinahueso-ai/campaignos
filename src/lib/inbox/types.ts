export type InboxChannelType =
  | "instagram_dm"
  | "facebook_message"
  | "instagram_comment"
  | "facebook_comment"
  | "instagram_tag"
  | "facebook_tag";

export type InboxItemStatus = "pending" | "approved" | "sent" | "archived";

export type InboxMessageDirection = "inbound" | "outbound";

import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";

export interface InboxThread {
  id: string;
  organizationId: string;
  channelType: InboxChannelType;
  externalThreadId: string;
  externalPostId: string | null;
  participantName: string | null;
  participantExternalId: string | null;
  participantAvatarUrl: string | null;
  pageAvatarUrl: string | null;
  subject: string | null;
  lastMessageSnippet: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: InboxItemStatus;
  followUp: boolean;
  markedDone: boolean;
  syncedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InboxMessage {
  id: string;
  organizationId: string;
  threadId: string;
  channelType: InboxChannelType;
  externalMessageId: string;
  direction: InboxMessageDirection;
  body: string;
  senderName: string | null;
  senderExternalId: string | null;
  sentAt: string | null;
  status: InboxItemStatus;
  aiDraftBody: string | null;
  aiDraftGeneratedAt: string | null;
  aiSourceUsed: InboxAiSourceUsed | null;
  approvedBody: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  sentToPlatformAt: string | null;
  externalSendId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface InboxChannelCounts {
  all: number;
  instagram_dm: number;
  facebook_message: number;
  instagram_comment: number;
  facebook_comment: number;
  instagram_tag: number;
  facebook_tag: number;
  tagged: number;
}

export interface InboxConnectionStatus {
  metaConnected: boolean;
  metaConfiguredViaEnv: boolean;
  integrationConfigured: boolean;
  facebookPageId: string | null;
  pageName: string | null;
  pagePictureUrl: string | null;
  hasInstagram: boolean;
  messagingReady: boolean;
  facebookCommentReplyReady: boolean;
  organizationName: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  grantedScopes: string[];
  missingFacebookCommentReplyScopes: string[];
  metaTokenValid: boolean;
  metaTokenNeverExpires: boolean;
  metaReconnectRequired: boolean;
}

export interface InboxPageData {
  connection: InboxConnectionStatus;
  threads: InboxThread[];
  messagesByThreadId: Record<string, InboxMessage[]>;
  channelCounts: InboxChannelCounts;
  oauthError: string | null;
  connectedJustNow: boolean;
}
