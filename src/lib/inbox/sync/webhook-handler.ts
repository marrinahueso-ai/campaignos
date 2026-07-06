import "server-only";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildCommentPostMetadata,
  resolveFacebookPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import { snippet } from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";
import { upsertWebhookMessage } from "@/lib/inbox/sync/upsert";
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
  const appSecret = getMetaAppSecret();
  if (!appSecret || !input.signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", appSecret)
    .update(input.rawBody, "utf8")
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(input.signatureHeader),
    );
  } catch {
    return false;
  }
}

async function findWebhookConnection(
  externalId: string,
): Promise<MetaWebhookConnection | null> {
  const admin = createAdminClient();

  const byPage = await admin
    .from("organization_meta_connections")
    .select("organization_id, facebook_page_id, instagram_account_id")
    .eq("facebook_page_id", externalId)
    .maybeSingle();

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

async function handleMessagingEvent(input: {
  connection: MetaWebhookConnection;
  messagingEvent: Record<string, unknown>;
  isInstagram: boolean;
}): Promise<boolean> {
  const message = input.messagingEvent.message as Record<string, unknown> | undefined;
  if (!message || typeof message !== "object") {
    return false;
  }

  const sender = input.messagingEvent.sender as Record<string, unknown> | undefined;
  const recipient = input.messagingEvent.recipient as Record<string, unknown> | undefined;
  const senderId = typeof sender?.id === "string" ? sender.id : null;
  const recipientId = typeof recipient?.id === "string" ? recipient.id : null;
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
    return false;
  }

  const conversationId =
    typeof input.messagingEvent.thread_id === "string"
      ? input.messagingEvent.thread_id
      : [senderId, recipientId].filter(Boolean).sort().join(":");

  if (!conversationId) {
    return false;
  }

  const channelType = messagingChannelType(input.isInstagram);
  const pageOrIgId = input.isInstagram
    ? input.connection.instagramAccountId || input.connection.facebookPageId
    : input.connection.facebookPageId;
  const direction = senderId === pageOrIgId ? "outbound" : "inbound";
  const participantId = direction === "inbound" ? senderId : recipientId;
  const sentAt =
    typeof input.messagingEvent.timestamp === "number"
      ? new Date(input.messagingEvent.timestamp).toISOString()
      : new Date().toISOString();

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

  return upsertWebhookMessage({
    organizationId: input.connection.organizationId,
    thread,
    message: normalizedMessage,
  });
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
      ? ((value.from as Record<string, unknown>).id as string | undefined) ?? null
      : null;
  const createdTime =
    typeof value.created_time === "number"
      ? new Date(value.created_time * 1000).toISOString()
      : new Date().toISOString();

  if (!commentId || !postId) {
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
      ? ((value.media as Record<string, unknown>).id as string | undefined) ?? null
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
  const object = typeof payload.object === "string" ? payload.object : "";
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  let processed = 0;
  let skipped = 0;

  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null) {
      skipped += 1;
      continue;
    }

    const entryRecord = entry as Record<string, unknown>;
    const entryId = typeof entryRecord.id === "string" ? entryRecord.id : null;
    if (!entryId) {
      skipped += 1;
      continue;
    }

    const connection = await findWebhookConnection(entryId);
    if (!connection) {
      skipped += 1;
      continue;
    }

    const messaging = Array.isArray(entryRecord.messaging) ? entryRecord.messaging : [];
    for (const event of messaging) {
      if (typeof event !== "object" || event === null) {
        skipped += 1;
        continue;
      }

      const saved = await handleMessagingEvent({
        connection,
        messagingEvent: event as Record<string, unknown>,
        isInstagram: object === "instagram",
      });

      if (saved) {
        processed += 1;
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
      } else {
        skipped += 1;
      }
    }
  }

  return { processed, skipped };
}
