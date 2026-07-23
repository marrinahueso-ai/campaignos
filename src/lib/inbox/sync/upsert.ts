import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UpsertInboxBatchResult {
  threadsUpserted: number;
  messagesUpserted: number;
  threadIdByExternalKey: Map<string, string>;
}

function threadKey(channelType: string, externalThreadId: string): string {
  return `${channelType}:${externalThreadId}`;
}

function buildThreadUpsertRow(input: {
  organizationId: string;
  thread: NormalizedInboxThread;
  now: string;
}): Record<string, unknown> {
  const row: Record<string, unknown> = {
    organization_id: input.organizationId,
    channel_type: input.thread.channelType,
    external_thread_id: input.thread.externalThreadId,
    external_post_id: input.thread.externalPostId ?? null,
    participant_name: input.thread.participantName ?? null,
    participant_external_id: input.thread.participantExternalId ?? null,
    subject: input.thread.subject ?? null,
    last_message_snippet: input.thread.lastMessageSnippet ?? null,
    last_message_at: input.thread.lastMessageAt ?? null,
    synced_at: input.now,
    metadata: input.thread.metadata ?? {},
    updated_at: input.now,
  };

  if (input.thread.unreadCount !== undefined) {
    row.unread_count = input.thread.unreadCount;
  }

  return row;
}

async function messageExists(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    channelType: string;
    externalMessageId: string;
  },
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("channel_type", input.channelType)
    .eq("external_message_id", input.externalMessageId)
    .maybeSingle();

  if (error) {
    console.error("[inbox] message lookup failed:", error.message);
    return null;
  }

  return Boolean(data);
}

async function incrementThreadUnreadForInboundMessage(
  supabase: SupabaseClient,
  input: {
    threadId: string;
    direction: NormalizedInboxMessage["direction"];
    isNewMessage: boolean;
    now: string;
  },
): Promise<void> {
  if (!input.isNewMessage || input.direction !== "inbound") {
    return;
  }

  const { data: threadData, error: threadError } = await supabase
    .from("inbox_threads")
    .select("unread_count, status, marked_done")
    .eq("id", input.threadId)
    .single();

  if (threadError || !threadData) {
    console.error("[inbox] unread increment lookup failed:", threadError?.message);
    return;
  }

  const nextUnreadCount = (threadData.unread_count as number | null) ?? 0;
  const currentStatus = (threadData.status as string | null) ?? "pending";
  // Re-open archived/sent/done threads when the same person messages again so they
  // return to All conversations with full history intact.
  const shouldReopen =
    currentStatus === "archived" ||
    currentStatus === "sent" ||
    Boolean(threadData.marked_done);

  const { error: unreadError } = await supabase
    .from("inbox_threads")
    .update({
      unread_count: nextUnreadCount + 1,
      ...(shouldReopen
        ? { status: "pending", marked_done: false }
        : { marked_done: false }),
      updated_at: input.now,
    })
    .eq("id", input.threadId);

  if (unreadError) {
    console.error("[inbox] unread increment failed:", unreadError.message);
  }
}

async function upsertInboxBatchWithClient(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    threads: NormalizedInboxThread[];
    messages: NormalizedInboxMessage[];
  },
): Promise<UpsertInboxBatchResult> {
  const now = new Date().toISOString();
  const threadIdByExternalKey = new Map<string, string>();

  let threadsUpserted = 0;
  let messagesUpserted = 0;

  for (const thread of input.threads) {
    const { data, error } = await supabase
      .from("inbox_threads")
      .upsert(buildThreadUpsertRow({ organizationId: input.organizationId, thread, now }), {
        onConflict: "organization_id,channel_type,external_thread_id",
      })
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

    const existingMessage = await messageExists(supabase, {
      organizationId: input.organizationId,
      channelType: message.channelType,
      externalMessageId: message.externalMessageId,
    });
    if (existingMessage === null) {
      continue;
    }

    const isNewMessage = !existingMessage;

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
      await incrementThreadUnreadForInboundMessage(supabase, {
        threadId,
        direction: message.direction,
        isNewMessage,
        now,
      });
    }
  }

  return {
    threadsUpserted,
    messagesUpserted,
    threadIdByExternalKey,
  };
}

export async function upsertInboxBatch(input: {
  organizationId: string;
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
}): Promise<UpsertInboxBatchResult> {
  const supabase = await createClient();
  return upsertInboxBatchWithClient(supabase, input);
}

export async function upsertWebhookMessage(input: {
  organizationId: string;
  thread: NormalizedInboxThread;
  message: NormalizedInboxMessage;
}): Promise<boolean> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const existingMessage = await messageExists(admin, {
    organizationId: input.organizationId,
    channelType: input.message.channelType,
    externalMessageId: input.message.externalMessageId,
  });

  if (existingMessage === null) {
    return false;
  }

  const isNewMessage = !existingMessage;

  const { data: threadData, error: threadError } = await admin
    .from("inbox_threads")
    .upsert(
      buildThreadUpsertRow({
        organizationId: input.organizationId,
        thread: input.thread,
        now,
      }),
      { onConflict: "organization_id,channel_type,external_thread_id" },
    )
    .select("id")
    .single();

  if (threadError || !threadData?.id) {
    console.error("[inbox webhook] thread upsert failed:", threadError?.message);
    return false;
  }

  const { error: messageError } = await admin.from("inbox_messages").upsert(
    {
      organization_id: input.organizationId,
      thread_id: threadData.id,
      channel_type: input.message.channelType,
      external_message_id: input.message.externalMessageId,
      direction: input.message.direction,
      body: input.message.body,
      sender_name: input.message.senderName ?? null,
      sender_external_id: input.message.senderExternalId ?? null,
      sent_at: input.message.sentAt ?? null,
      metadata: input.message.metadata ?? {},
      updated_at: now,
    },
    { onConflict: "organization_id,channel_type,external_message_id" },
  );

  if (messageError) {
    console.error("[inbox webhook] message upsert failed:", messageError.message);
    return false;
  }

  await incrementThreadUnreadForInboundMessage(admin, {
    threadId: threadData.id as string,
    direction: input.message.direction,
    isNewMessage,
    now,
  });

  return true;
}
