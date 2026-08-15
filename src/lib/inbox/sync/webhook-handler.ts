import "server-only";

import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import {
  buildCommentPostMetadata,
  resolveFacebookPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import { buildAvatarMetadata } from "@/lib/inbox/avatars";
import { snippet } from "@/lib/inbox/sync/graph-client";
import {
  fallbackInboxParticipantName,
  preferInboxParticipantName,
} from "@/lib/inbox/sync/participant-identity";
import { fetchConnectedPageProfilePictures, fetchMessagingParticipantProfile } from "@/lib/inbox/sync/profile-pictures";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";
import { touchOrganizationInboxSyncedAt } from "@/lib/inbox/settings";
import { upsertWebhookMessage } from "@/lib/inbox/sync/upsert";
import { inboxGraphGet } from "@/lib/inbox/sync/graph-client";
import {
  collectMessagingEventsFromEntry,
  describeMessagingSkipReason,
  parseFeedCommentChange,
  parseMetaWebhookTimestamp,
  readMetaId,
  verifyMetaWebhookSignatureWithSecret,
} from "@/lib/inbox/sync/webhook-payload";
import { getMetaConnectionForOrganization } from "@/lib/meta-publishing/connection";
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

  let participantName = fallbackInboxParticipantName(participantId);
  let participantAvatarUrl: string | null = null;
  let pageAvatarUrl: string | null = null;
  let instagramAvatarUrl: string | null = null;

  const metaConnection = await getMetaConnectionForOrganization(
    input.connection.organizationId,
    { useServiceRole: true },
  );

  if (metaConnection?.pageAccessToken) {
    const pagePicturesPromise = fetchConnectedPageProfilePictures({
      pageId: input.connection.facebookPageId,
      instagramAccountId: input.connection.instagramAccountId ?? "",
      pageAccessToken: metaConnection.pageAccessToken,
    });

    if (participantId) {
      const [profile, pagePictures] = await Promise.all([
        fetchMessagingParticipantProfile({
          participantId,
          pageAccessToken: metaConnection.pageAccessToken,
          preferInstagram: input.isInstagram,
        }),
        pagePicturesPromise,
      ]);
      participantName = preferInboxParticipantName(null, profile.name) ?? participantName;
      participantAvatarUrl = profile.avatarUrl;
      pageAvatarUrl = pagePictures.pageAvatarUrl;
      instagramAvatarUrl = pagePictures.instagramAvatarUrl;
    } else {
      const pagePictures = await pagePicturesPromise;
      pageAvatarUrl = pagePictures.pageAvatarUrl;
      instagramAvatarUrl = pagePictures.instagramAvatarUrl;
    }
  }

  const thread: NormalizedInboxThread = {
    channelType,
    externalThreadId: conversationId,
    participantExternalId: participantId,
    participantName,
    lastMessageSnippet: snippet(body || "(attachment)"),
    lastMessageAt: sentAt,
    metadata: buildAvatarMetadata({
      participantAvatarUrl,
      pageAvatarUrl,
      instagramAvatarUrl,
    }),
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

async function enrichFeedCommentFromGraph(input: {
  organizationId: string;
  commentId: string;
  postId: string;
  message: string;
  senderName: string;
  senderId: string | null;
  createdTimeIso: string;
  facebookPageId: string;
  instagramAccountId: string | null;
}): Promise<{
  message: string;
  senderName: string;
  senderId: string | null;
  createdTimeIso: string;
  postCaption: string | null;
  postImageUrl: string | null;
  postPublishedAt: string | null;
  participantAvatarUrl: string | null;
  pageAvatarUrl: string | null;
  instagramAvatarUrl: string | null;
}> {
  let message = input.message;
  let senderName = input.senderName;
  let senderId = input.senderId;
  let createdTimeIso = input.createdTimeIso;
  let postCaption: string | null = null;
  let postImageUrl: string | null = null;
  let postPublishedAt: string | null = null;
  let participantAvatarUrl: string | null = null;
  let pageAvatarUrl: string | null = null;
  let instagramAvatarUrl: string | null = null;

  const needsCommentEnrichment =
    !message.trim() ||
    !senderId ||
    senderName === "Facebook user";

  const metaConnection = await getMetaConnectionForOrganization(input.organizationId, {
    useServiceRole: true,
  });
  const pageAccessToken = metaConnection?.pageAccessToken;
  if (!pageAccessToken) {
    return {
      message,
      senderName,
      senderId,
      createdTimeIso,
      postCaption,
      postImageUrl,
      postPublishedAt,
      participantAvatarUrl,
      pageAvatarUrl,
      instagramAvatarUrl,
    };
  }

  if (needsCommentEnrichment) {
    const commentResult = await inboxGraphGet<Record<string, unknown>>(
      `/${input.commentId}`,
      {
        fields: "id,message,from,created_time",
        access_token: pageAccessToken,
      },
    );
    if (commentResult.ok) {
      const from = commentResult.data.from;
      if ((!message.trim()) && typeof commentResult.data.message === "string") {
        message = commentResult.data.message;
      }
      if (from && typeof from === "object") {
        const fromRecord = from as Record<string, unknown>;
        const graphName =
          typeof fromRecord.name === "string" ? fromRecord.name.trim() : "";
        if (graphName && (senderName === "Facebook user" || !senderName.trim())) {
          senderName = graphName;
        }
        senderId = readMetaId(fromRecord.id) ?? senderId;
      }
      if (commentResult.data.created_time != null) {
        createdTimeIso = parseMetaWebhookTimestamp(commentResult.data.created_time);
      }
    }
  }

  const postResultPromise = inboxGraphGet<Record<string, unknown>>(`/${input.postId}`, {
    fields: "id,message,full_picture,created_time,permalink_url",
    access_token: pageAccessToken,
  });
  const pagePicturesPromise = fetchConnectedPageProfilePictures({
    pageId: input.facebookPageId,
    instagramAccountId: input.instagramAccountId ?? "",
    pageAccessToken,
  });
  const participantProfilePromise = senderId
    ? fetchMessagingParticipantProfile({
        participantId: senderId,
        pageAccessToken,
        preferInstagram: false,
      })
    : Promise.resolve({ name: null, avatarUrl: null });

  const [postResult, pagePictures, participantProfile] = await Promise.all([
    postResultPromise,
    pagePicturesPromise,
    participantProfilePromise,
  ]);

  if (postResult.ok) {
    postCaption =
      typeof postResult.data.message === "string" ? postResult.data.message : null;
    postImageUrl =
      typeof postResult.data.full_picture === "string"
        ? postResult.data.full_picture
        : null;
    if (typeof postResult.data.created_time === "string") {
      const parsed = Date.parse(postResult.data.created_time);
      if (Number.isFinite(parsed)) {
        postPublishedAt = new Date(parsed).toISOString();
      }
    }
  }

  pageAvatarUrl = pagePictures.pageAvatarUrl;
  instagramAvatarUrl = pagePictures.instagramAvatarUrl;
  participantAvatarUrl = participantProfile.avatarUrl;
  if (
    participantProfile.name?.trim() &&
    (senderName === "Facebook user" || !senderName.trim())
  ) {
    senderName = participantProfile.name.trim();
  }

  return {
    message,
    senderName,
    senderId,
    createdTimeIso,
    postCaption,
    postImageUrl,
    postPublishedAt,
    participantAvatarUrl,
    pageAvatarUrl,
    instagramAvatarUrl,
  };
}

async function handleFeedCommentChange(input: {
  connection: MetaWebhookConnection;
  value: Record<string, unknown>;
}): Promise<boolean> {
  const parsed = parseFeedCommentChange(input.value);
  if (!parsed.shouldPersist) {
    // Reactions / likes / removes are normal feed noise — don't error-log them.
    if (
      parsed.skipReason?.startsWith("non_comment_item:") ||
      parsed.skipReason?.startsWith("ignored_verb:")
    ) {
      return false;
    }
    console.error("[inbox webhook] skipped feed comment:", {
      reason: parsed.skipReason,
      pageId: input.connection.facebookPageId,
      item: input.value.item,
      verb: parsed.verb,
      hasPostId: Boolean(readMetaId(input.value.post_id)),
      hasParentId: Boolean(readMetaId(input.value.parent_id)),
      hasCommentId: Boolean(parsed.commentId),
    });
    return false;
  }

  const enriched = await enrichFeedCommentFromGraph({
    organizationId: input.connection.organizationId,
    commentId: parsed.commentId,
    postId: parsed.postId,
    message: parsed.message,
    senderName: parsed.senderName,
    senderId: parsed.senderId,
    createdTimeIso: parsed.createdTimeIso,
    facebookPageId: input.connection.facebookPageId,
    instagramAccountId: input.connection.instagramAccountId,
  });

  const threadExternalId = `${parsed.postId}:${parsed.commentId}`;
  const postMetadata = {
    ...buildCommentPostMetadata({
      caption: enriched.postCaption,
      imageUrl: enriched.postImageUrl,
      permalink: resolveFacebookPostPermalink({ postId: parsed.postId }),
      postId: parsed.postId,
      publishedAt: enriched.postPublishedAt,
    }),
    ...buildAvatarMetadata({
      participantAvatarUrl: enriched.participantAvatarUrl,
      pageAvatarUrl: enriched.pageAvatarUrl,
      instagramAvatarUrl: enriched.instagramAvatarUrl,
    }),
  };
  const thread: NormalizedInboxThread = {
    channelType: "facebook_comment",
    externalThreadId: threadExternalId,
    externalPostId: parsed.postId,
    participantName: enriched.senderName,
    participantExternalId: enriched.senderId,
    subject: enriched.postCaption
      ? snippet(enriched.postCaption, 80)
      : "Facebook post comment",
    lastMessageSnippet: snippet(enriched.message),
    lastMessageAt: enriched.createdTimeIso,
    metadata: postMetadata,
  };

  const normalizedMessage: NormalizedInboxMessage = {
    channelType: "facebook_comment",
    externalThreadId: threadExternalId,
    externalMessageId: parsed.commentId,
    // Seed comments are inbound for inbox UX even when Meta attributes the Page.
    direction: "inbound",
    body: enriched.message,
    senderName: enriched.senderName,
    senderExternalId: enriched.senderId,
    sentAt: enriched.createdTimeIso,
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
      if (field === "feed") {
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
