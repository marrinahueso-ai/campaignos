import {
  readParticipantAvatarUrl,
  resolveThreadPageAvatarUrl,
} from "@/lib/inbox/avatars";
import type { InboxMessageRow, InboxThreadRow } from "@/lib/inbox/db-types";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";

export function mapInboxThreadRow(row: InboxThreadRow): InboxThread {
  const metadata = row.metadata ?? {};

  return {
    id: row.id,
    organizationId: row.organization_id,
    channelType: row.channel_type,
    externalThreadId: row.external_thread_id,
    externalPostId: row.external_post_id,
    participantName: row.participant_name,
    participantExternalId: row.participant_external_id,
    participantAvatarUrl: readParticipantAvatarUrl(metadata),
    pageAvatarUrl: resolveThreadPageAvatarUrl({
      channelType: row.channel_type,
      metadata,
    }),
    subject: row.subject,
    lastMessageSnippet: row.last_message_snippet,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
    status: row.status,
    syncedAt: row.synced_at,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInboxMessageRow(row: InboxMessageRow): InboxMessage {
  return {
    id: row.id,
    organizationId: row.organization_id,
    threadId: row.thread_id,
    channelType: row.channel_type,
    externalMessageId: row.external_message_id,
    direction: row.direction,
    body: row.body,
    senderName: row.sender_name,
    senderExternalId: row.sender_external_id,
    sentAt: row.sent_at,
    status: row.status,
    aiDraftBody: row.ai_draft_body,
    aiDraftGeneratedAt: row.ai_draft_generated_at,
    aiSourceUsed: row.ai_source_used ?? null,
    approvedBody: row.approved_body,
    approvedAt: row.approved_at,
    approvedByUserId: row.approved_by_user_id,
    sentToPlatformAt: row.sent_to_platform_at,
    externalSendId: row.external_send_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
