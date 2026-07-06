import type {
  InboxChannelType,
  InboxItemStatus,
  InboxMessageDirection,
} from "@/lib/inbox/types";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";

export interface InboxThreadRow {
  id: string;
  organization_id: string;
  channel_type: InboxChannelType;
  external_thread_id: string;
  external_post_id: string | null;
  participant_name: string | null;
  participant_external_id: string | null;
  subject: string | null;
  last_message_snippet: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: InboxItemStatus;
  synced_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InboxMessageRow {
  id: string;
  organization_id: string;
  thread_id: string;
  channel_type: InboxChannelType;
  external_message_id: string;
  direction: InboxMessageDirection;
  body: string;
  sender_name: string | null;
  sender_external_id: string | null;
  sent_at: string | null;
  status: InboxItemStatus;
  ai_draft_body: string | null;
  ai_draft_generated_at: string | null;
  ai_source_used: InboxAiSourceUsed | null;
  approved_body: string | null;
  approved_at: string | null;
  approved_by_user_id: string | null;
  sent_to_platform_at: string | null;
  external_send_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInboxSettingsRow {
  id: string;
  organization_id: string;
  sync_enabled: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
  messaging_scopes_granted: string | null;
  created_at: string;
  updated_at: string;
}
