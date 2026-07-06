import type { InboxChannelType, InboxMessageDirection } from "@/lib/inbox/types";

export interface NormalizedInboxThread {
  channelType: InboxChannelType;
  externalThreadId: string;
  externalPostId?: string | null;
  participantName?: string | null;
  participantExternalId?: string | null;
  subject?: string | null;
  lastMessageSnippet?: string | null;
  lastMessageAt?: string | null;
  unreadCount?: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedInboxMessage {
  channelType: InboxChannelType;
  externalThreadId: string;
  externalMessageId: string;
  direction: InboxMessageDirection;
  body: string;
  senderName?: string | null;
  senderExternalId?: string | null;
  sentAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface InboxSyncChannelResult {
  channel: InboxChannelType | "all";
  threadsFound: number;
  messagesFound: number;
  error: string | null;
}

export interface InboxSyncResult {
  ok: boolean;
  threadsUpserted: number;
  messagesUpserted: number;
  channels: InboxSyncChannelResult[];
  error: string | null;
}
