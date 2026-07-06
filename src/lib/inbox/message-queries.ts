import "server-only";

import { mapInboxMessageRow, mapInboxThreadRow } from "@/lib/inbox/mappers";
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

export async function getLatestInboundReplyTarget(input: {
  organizationId: string;
  threadId: string;
}): Promise<InboxMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("thread_id", input.threadId)
    .eq("direction", "inbound")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error || !data?.length) {
    return null;
  }

  const rows = data as InboxMessageRow[];
  const pending = rows.find((row) => row.status !== "sent" && row.status !== "archived");
  const target = pending ?? rows[0];
  return mapInboxMessageRow(target);
}
