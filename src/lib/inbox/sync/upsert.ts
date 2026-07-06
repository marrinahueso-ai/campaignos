import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

export interface UpsertInboxBatchResult {
  threadsUpserted: number;
  messagesUpserted: number;
  threadIdByExternalKey: Map<string, string>;
}

function threadKey(channelType: string, externalThreadId: string): string {
  return `${channelType}:${externalThreadId}`;
}

export async function upsertInboxBatch(input: {
  organizationId: string;
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
}): Promise<UpsertInboxBatchResult> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const threadIdByExternalKey = new Map<string, string>();

  let threadsUpserted = 0;
  let messagesUpserted = 0;

  for (const thread of input.threads) {
    const { data, error } = await supabase
      .from("inbox_threads")
      .upsert(
        {
          organization_id: input.organizationId,
          channel_type: thread.channelType,
          external_thread_id: thread.externalThreadId,
          external_post_id: thread.externalPostId ?? null,
          participant_name: thread.participantName ?? null,
          participant_external_id: thread.participantExternalId ?? null,
          subject: thread.subject ?? null,
          last_message_snippet: thread.lastMessageSnippet ?? null,
          last_message_at: thread.lastMessageAt ?? null,
          unread_count: thread.unreadCount ?? 0,
          synced_at: now,
          metadata: thread.metadata ?? {},
          updated_at: now,
        },
        { onConflict: "organization_id,channel_type,external_thread_id" },
      )
      .select("id, channel_type, external_thread_id")
      .single();

    if (!error && data) {
      threadsUpserted += 1;
      threadIdByExternalKey.set(
        threadKey(data.channel_type as string, data.external_thread_id as string),
        data.id as string,
      );
    }
  }

  for (const message of input.messages) {
    const resolvedThreadId = threadIdByExternalKey.get(
      threadKey(message.channelType, message.externalThreadId),
    );

    if (!resolvedThreadId) {
      const { data: threadRow } = await supabase
        .from("inbox_threads")
        .select("id")
        .eq("organization_id", input.organizationId)
        .eq("channel_type", message.channelType)
        .eq("external_thread_id", message.externalThreadId)
        .maybeSingle();

      if (!threadRow?.id) {
        continue;
      }

      threadIdByExternalKey.set(
        threadKey(message.channelType, message.externalThreadId),
        threadRow.id,
      );
    }

    const threadId =
      threadIdByExternalKey.get(threadKey(message.channelType, message.externalThreadId)) ??
      null;
    if (!threadId) {
      continue;
    }

    const { error } = await supabase.from("inbox_messages").upsert(
      {
        organization_id: input.organizationId,
        thread_id: threadId,
        channel_type: message.channelType,
        external_message_id: message.externalMessageId,
        direction: message.direction,
        body: message.body,
        sender_name: message.senderName ?? null,
        sender_external_id: message.senderExternalId ?? null,
        sent_at: message.sentAt ?? null,
        metadata: message.metadata ?? {},
        updated_at: now,
      },
      { onConflict: "organization_id,channel_type,external_message_id" },
    );

    if (!error) {
      messagesUpserted += 1;
    }
  }

  return {
    threadsUpserted,
    messagesUpserted,
    threadIdByExternalKey,
  };
}

export async function upsertWebhookMessage(input: {
  organizationId: string;
  thread: NormalizedInboxThread;
  message: NormalizedInboxMessage;
}): Promise<boolean> {
  const result = await upsertInboxBatch({
    organizationId: input.organizationId,
    threads: [input.thread],
    messages: [input.message],
  });

  return result.messagesUpserted > 0;
}
