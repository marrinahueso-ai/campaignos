import type { InboxThreadRow } from "@/lib/inbox/db-types";
import type { InboxThread } from "@/lib/inbox/types";

export function mapInboxThreadRow(row: InboxThreadRow): InboxThread {
  return {
    id: row.id,
    organizationId: row.organization_id,
    channelType: row.channel_type,
    externalThreadId: row.external_thread_id,
    externalPostId: row.external_post_id,
    participantName: row.participant_name,
    participantExternalId: row.participant_external_id,
    subject: row.subject,
    lastMessageSnippet: row.last_message_snippet,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
    status: row.status,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
