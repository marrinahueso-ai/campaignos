import "server-only";

import { mapInboxMessageRow, mapInboxThreadRow } from "@/lib/inbox/mappers";
import { resolveInboxReplyTarget } from "@/lib/inbox/reply-target";
import type { InboxMessageRow, InboxThreadRow } from "@/lib/inbox/db-types";
import type { InboxMessage, InboxThread } from "@/lib/inbox/types";
import { createClient } from "@/lib/supabase/server";

export async function getInboxThreadById(input: {
  organizationId: string;
  threadId: string;
}): Promise<InboxThread | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.threadId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapInboxThreadRow(data as InboxThreadRow);
}

export async function getInboxMessageById(input: {
  organizationId: string;
  messageId: string;
}): Promise<InboxMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("id", input.messageId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapInboxMessageRow(data as InboxMessageRow);
}

export async function getInboxMessagesForThread(input: {
  organizationId: string;
  threadId: string;
}): Promise<InboxMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("thread_id", input.threadId)
    .order("sent_at", { ascending: true, nullsFirst: false });

  if (error || !data?.length) {
    return [];
  }

  return (data as InboxMessageRow[]).map(mapInboxMessageRow);
}

export async function getLatestReplyTarget(input: {
  organizationId: string;
  threadId: string;
}): Promise<InboxMessage | null> {
  const thread = await getInboxThreadById(input);
  if (!thread) {
    return null;
  }

  const messages = await getInboxMessagesForThread(input);
  return resolveInboxReplyTarget({
    channelType: thread.channelType,
    messages,
  });
}

/** @deprecated Prefer getLatestReplyTarget — kept for callers that only need inbound DMs. */
export async function getLatestInboundReplyTarget(input: {
  organizationId: string;
  threadId: string;
}): Promise<InboxMessage | null> {
  return getLatestReplyTarget(input);
}
