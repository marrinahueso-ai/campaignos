import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  buildCommentPostMetadata,
  resolveFacebookPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import { snippet } from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";
import { touchOrganizationInboxSyncedAt } from "@/lib/inbox/settings";
import { upsertWebhookMessage } from "@/lib/inbox/sync/upsert";
import {
  collectMessagingEventsFromEntry,
  describeMessagingSkipReason,
  parseMetaWebhookTimestamp,
  readMetaId,
  verifyMetaWebhookSignatureWithSecret,
} from "@/lib/inbox/sync/webhook-payload";
import { getMetaAppSecret } from "@/lib/meta-publishing/config.server";

interface MetaWebhookConnection {
  organizationId: string;
  facebookPageId: string;
  instagramAccountId: string;
}

export function verifyMetaWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}): boolean {
  let appSecret: string;
  try {
    appSecret = getMetaAppSecret();
  } catch {
    console.error("[inbox webhook] signature check failed: META_APP_SECRET not configured");
    return false;
  }

  return verifyMetaWebhookSignatureWithSecret({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    appSecret,
  });
}

async function findWebhookConnection(
  externalId: string,
): Promise<MetaWebhookConnection | null> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "[inbox webhook] org lookup failed: SUPABASE_SERVICE_ROLE_KEY not configured",
      { externalId },
    );
    return null;
  }

  const admin = createAdminClient();

  const byPage = await admin
    .from("organization_meta_connections")
    .select("organization_id, facebook_page_id, instagram_account_id")
    .eq("facebook_page_id", externalId)
    .maybeSingle();

  if (byPage.error) {
    console.error("[inbox webhook] org lookup by page failed:", {
      externalId,
      error: byPage.error.message,
    });
  }

  if (byPage.data) {
    return {
      organizationId: byPage.data.organization_id as string,
      facebookPageId: byPage.data.facebook_page_id as string,
      instagramAccountId: (byPage.data.instagram_account_id as string) ?? "",
    };
  }

  const byInstagram = await admin
    .from("organization_meta_connections")
    .select("organization_id, facebook_page_id, instagram_account_id")
    .eq("instagram_account_id", externalId)
    .maybeSingle();

  if (byInstagram.error) {
    console.error("[inbox webhook] org lookup by instagram failed:", {
      externalId,
      error: byInstagram.error.message,
    });
  }

  if (byInstagram.data) {
    return {
      organizationId: byInstagram.data.organization_id as string,
      facebookPageId: byInstagram.data.facebook_page_id as string,
      instagramAccountId: (byInstagram.data.instagram_account_id as string) ?? "",
    };
  }

  return null;
}

function messagingChannelType(
  isInstagram: boolean,
): "instagram_dm" | "facebook_message" {
  return isInstagram ? "instagram_dm" : "facebook_message";
}

async function resolveMessagingThreadExternalId(input: {
  organizationId: string;
  channelType: "instagram_dm" | "facebook_message";
  messagingEvent: Record<string, unknown>;
  senderId: string | null;
  recipientId: string | null;
  participantId: string | null;
}): Promise<string | null> {
  const threadId = readMetaId(input.messagingEvent.thread_id);
  if (threadId) {
    return threadId;
  }

  if (input.participantId) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("inbox_threads")
      .select("external_thread_id")
      .eq("organization_id", input.organizationId)
      .eq("channel_type", input.channelType)
      .eq("participant_external_id", input.participantId)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) {
      console.error("[inbox webhook] thread lookup by participant failed:", {
        organizationId: input.organizationId,
        channelType: input.channelType,
        participantId: input.participantId,
        error: error.message,
      });
    }

    const row = data?.[0];
    if (row?.external_thread_id) {
      return row.external_thread_id as string;
    }
  }

  const fallback = [input.senderId, input.recipientId].filter(Boolean).sort().join(":");
  return fallback || null;
}

async function handleMessagingEvent(input: {
  connection: MetaWebhookConnection;
  messagingEvent: Record<string, unknown>;
  isInstagram: boolean;
  eventSource: "messaging" | "standby";
}): Promise<boolean> {
  const message = input.messagingEvent.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") {
    console.error("[inbox webhook] skipped messaging event:", {
      reason: describeMessagingSkipReason(input.messagingEvent),
      eventSource: input.eventSource,
      pageId: input.connection.facebookPageId,
    });
    return false;
  }

  const sender = input.messagingEvent.sender as Record<string, unknown> | undefined;
  const recipient = input.messagingEvent.recipient as Record<string, unknown> | undefined;
  const senderId = readMetaId(sender?.id);
  const recipientId = readMetaId(recipient?.id);
  const externalMessageId =
    typeof message.mid === "string"
      ? message.mid
      : typeof message.id === "string"
        ? message.id
        : null;
  const body =
    typeof message.text === "string"
      ? message.text
      : typeof message.message === "string"
        ? message.message
        : "";

  if (!externalMessageId) {
    console.error("[inbox webhook] skipped messaging event:", {
      reason: "missing_message_id",
      eventSource: input.eventSource,
      pageId: input.connection.facebookPageId,
    });
    return false;
  }

  const channelType = messagingChannelType(input.isInstagram);
  const pageOrIgId = input.isInstagram
    ? input.connection.instagramAccountId || input.connection.facebookPageId
    : input.connection.facebookPageId;
  const direction = senderId === pageOrIgId ? "outbound" : "inbound";
  const participantId = direction === "inbound" ? senderId : recipientId;
  const conversationId = await resolveMessagingThreadExternalId({
    organizationId: input.connection.organizationId,
    channelType,
    messagingEvent: input.messagingEvent,
    senderId,
    recipientId,
    participantId,
  });

  if (!conversationId) {
    console.error("[inbox webhook] skipped messaging event:", {
      reason: "missing_conversation_id",
      eventSource: input.eventSource,
      pageId: input.connection.facebookPageId,
      senderId,
      recipientId,
    });
    return false;
  }

  const sentAt = parseMetaWebhookTimestamp(input.messagingEvent.timestamp);

  const thread: NormalizedInboxThread = {
    channelType,
    externalThreadId: conversationId,
    participantExternalId: participantId,
    participantName: participantId ? `User ${participantId.slice(-6)}` : "Messenger user",
    lastMessageSnippet: snippet(body || "(attachment)"),
    lastMessageAt: sentAt,
  };

  const normalizedMessage: NormalizedInboxMessage = {
    channelType,
    externalThreadId: conversationId,
    externalMessageId,
    direction,
    body: body || "(attachment)",
    senderExternalId: senderId,
    sentAt,
  };

  const saved = await upsertWebhookMessage({
    organizationId: input.connection.organizationId,
    thread,
    message: normalizedMessage,
  });

  if (!saved) {
    console.error("[inbox webhook] upsert failed:", {
      organizationId: input.connection.organizationId,
      channelType,
      externalMessageId,
      conversationId,
      eventSource: input.eventSource,
    });
  }

  return saved;
}

async function handleFeedCommentChange(input: {
  connection: MetaWebhookConnection;
  value: Record<string, unknown>;
}): Promise<boolean> {
  const value = input.value;
  const commentId = typeof value.comment_id === "string" ? value.comment_id : null;
  const postId = typeof value.post_id === "string" ? value.post_id : null;
  const message = typeof value.message === "string" ? value.message : "";
  const senderName =
    typeof value.from === "object" && value.from !== null
      ? ((value.from as Record<string, unknown>).name as string | undefined) ?? "Facebook user"
      : "Facebook user";
  const senderId =
    typeof value.from === "object" && value.from !== null
      ? readMetaId((value.from as Record<string, unknown>).id)
      : null;
  const createdTime =
    typeof value.created_time === "number"
      ? new Date(value.created_time * 1000).toISOString()
      : new Date().toISOString();

  if (!commentId || !postId) {
    console.error("[inbox webhook] skipped feed comment:", {
      reason: "missing_comment_or_post_id",
      pageId: input.connection.facebookPageId,
    });
    return false;
  }

  const threadExternalId = `${postId}:${commentId}`;
  const postMetadata = buildCommentPostMetadata({
    caption: null,
    imageUrl: null,
    permalink: resolveFacebookPostPermalink({ postId }),
    postId,
  });
  const thread: NormalizedInboxThread = {
    channelType: "facebook_comment",
    externalThreadId: threadExternalId,
    externalPostId: postId,
    participantName: senderName,
    participantExternalId: senderId,
    subject: "Facebook post comment",
    lastMessageSnippet: snippet(message),
    lastMessageAt: createdTime,
    metadata: postMetadata,
  };

  const normalizedMessage: NormalizedInboxMessage = {
    channelType: "facebook_comment",
    externalThreadId: threadExternalId,
    externalMessageId: commentId,
    direction: senderId === input.connection.facebookPageId ? "outbound" : "inbound",
    body: message,
    senderName,
    senderExternalId: senderId,
    sentAt: createdTime,
    metadata: postMetadata,
  };

  return upsertWebhookMessage({
    organizationId: input.connection.organizationId,
    thread,
    message: normalizedMessage,
  });
}

async function handleInstagramCommentChange(input: {
  connection: MetaWebhookConnection;
  value: Record<string, unknown>;
}): Promise<boolean> {
  const value = input.value;
  const commentId = typeof value.id === "string" ? value.id : null;
  const mediaId =
    typeof value.media === "object" && value.media !== null
      ? readMetaId((value.media as Record<string, unknown>).id)
      : typeof value.media_id === "string"
        ? value.media_id
        : null;
  const text = typeof value.text === "string" ? value.text : "";
  const username = typeof value.username === "string" ? value.username : "Instagram user";
  const timestamp =
    typeof value.timestamp === "number"
      ? new Date(value.timestamp * 1000).toISOString()
      : new Date().toISOString();

  if (!commentId || !mediaId) {
    console.error("[inbox webhook] skipped instagram comment:", {
      reason: "missing_comment_or_media_id",
      instagramAccountId: input.connection.instagramAccountId,
    });
    return false;
  }

  const threadExternalId = `${mediaId}:${commentId}`;
  const postMetadata = buildCommentPostMetadata({
    caption: null,
    imageUrl: null,
    permalink: null,
    mediaId,
  });
  const thread: NormalizedInboxThread = {
    channelType: "instagram_comment",
    externalThreadId: threadExternalId,
    externalPostId: mediaId,
    participantName: username,
    subject: "Instagram post comment",
    lastMessageSnippet: snippet(text),
    lastMessageAt: timestamp,
    metadata: postMetadata,
  };

  const normalizedMessage: NormalizedInboxMessage = {
    channelType: "instagram_comment",
    externalThreadId: threadExternalId,
    externalMessageId: commentId,
    direction: "inbound",
    body: text,
    senderName: username,
    sentAt: timestamp,
    metadata: postMetadata,
  };

  return upsertWebhookMessage({
    organizationId: input.connection.organizationId,
    thread,
    message: normalizedMessage,
  });
}

export async function processMetaWebhookPayload(
  payload: Record<string, unknown>,
): Promise<{ processed: number; skipped: number }> {
  if (!isSupabaseAdminConfigured()) {
    console.error(
      "[inbox webhook] payload processing aborted: SUPABASE_SERVICE_ROLE_KEY not configured",
    );
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }

  const object = typeof payload.object === "string" ? payload.object : "";
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  let processed = 0;
  let skipped = 0;
  const syncedOrganizationIds = new Set<string>();

  if (entries.length === 0) {
    console.error("[inbox webhook] payload has no entries:", { object });
  }

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      skipped += 1;
      continue;
    }

    const entryRecord = entry as Record<string, unknown>;
    const entryId = readMetaId(entryRecord.id);
    if (!entryId) {
      console.error("[inbox webhook] skipped entry: missing id", { object });
      skipped += 1;
      continue;
    }

    const connection = await findWebhookConnection(entryId);
    if (!connection) {
      console.error("[inbox webhook] no org connection for entry id:", {
        entryId,
        object,
      });
      skipped += 1;
      continue;
    }

    const { events, sources } = collectMessagingEventsFromEntry(entryRecord);
    if (events.length === 0) {
      const hasChanges = Array.isArray(entryRecord.changes) && entryRecord.changes.length > 0;
      if (!hasChanges) {
        console.error("[inbox webhook] entry has no messaging, standby, or changes:", {
          entryId,
          object,
        });
      }
    }

    for (let index = 0; index < events.length; index += 1) {
      const event = events[index];
      const eventSource = sources[index] ?? "messaging";

      const saved = await handleMessagingEvent({
        connection,
        messagingEvent: event,
        isInstagram: object === "instagram",
        eventSource,
      });

      if (saved) {
        processed += 1;
        syncedOrganizationIds.add(connection.organizationId);
      } else {
        skipped += 1;
      }
    }

    const changes = Array.isArray(entryRecord.changes) ? entryRecord.changes : [];
    for (const change of changes) {
      if (typeof change !== "object" || change === null) {
        skipped += 1;
        continue;
      }

      const changeRecord = change as Record<string, unknown>;
      const field = typeof changeRecord.field === "string" ? changeRecord.field : "";
      const value =
        typeof changeRecord.value === "object" && changeRecord.value !== null
          ? (changeRecord.value as Record<string, unknown>)
          : null;

      if (!value) {
        skipped += 1;
        continue;
      }

      let saved = false;
      if (field === "feed" && value.item === "comment") {
        saved = await handleFeedCommentChange({ connection, value });
      } else if (field === "comments") {
        saved = await handleInstagramCommentChange({ connection, value });
      } else {
        skipped += 1;
        continue;
      }

      if (saved) {
        processed += 1;
        syncedOrganizationIds.add(connection.organizationId);
      } else {
        skipped += 1;
      }
    }
  }

  if (syncedOrganizationIds.size > 0) {
    await Promise.all(
      [...syncedOrganizationIds].map((organizationId) =>
        touchOrganizationInboxSyncedAt(organizationId),
      ),
    );
  }

  return { processed, skipped };
}
