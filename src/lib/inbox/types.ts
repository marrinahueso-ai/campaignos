export type InboxChannelType =
  | "instagram_dm"
  | "facebook_message"
  | "instagram_comment"
  | "facebook_comment";

export type InboxItemStatus = "pending" | "approved" | "sent" | "archived";

export type InboxMessageDirection = "inbound" | "outbound";

export interface InboxThread {
  id: string;
  organizationId: string;
  channelType: InboxChannelType;
  externalThreadId: string;
  externalPostId: string | null;
  participantName: string | null;
  participantExternalId: string | null;
  subject: string | null;
  lastMessageSnippet: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: InboxItemStatus;
  syncedAt: string | null;
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
  approvedBody: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  sentToPlatformAt: string | null;
  externalSendId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxChannelCounts {
  all: number;
  instagram_dm: number;
  facebook_message: number;
  instagram_comment: number;
  facebook_comment: number;
}

export interface InboxConnectionStatus {
  metaConnected: boolean;
  metaConfiguredViaEnv: boolean;
  integrationConfigured: boolean;
  pageName: string | null;
  hasInstagram: boolean;
  messagingReady: boolean;
  organizationName: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  grantedScopes: string[];
}

export interface InboxPageData {
  connection: InboxConnectionStatus;
  threads: InboxThread[];
  messagesByThreadId: Record<string, InboxMessage[]>;
  channelCounts: InboxChannelCounts;
  oauthError: string | null;
  connectedJustNow: boolean;
}
