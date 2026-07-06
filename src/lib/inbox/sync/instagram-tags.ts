import {
  asRecord,
  asRecordArray,
  inboxGraphGet,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const TAG_FIELDS =
  "id,caption,media_type,media_url,permalink,timestamp,username,owner{id,username}";

export async function fetchInstagramTaggedMedia(input: {
  instagramAccountId: string;
  pageAccessToken: string;
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
  warning: string | null;
}> {
  const instagramAccountId = input.instagramAccountId.trim();
  if (!instagramAccountId) {
    return {
      threads: [],
      messages: [],
      error: "Instagram account is not linked to this Page.",
      warning: null,
    };
  }

  const tagsResult = await inboxGraphGetAllPages(
    `/${instagramAccountId}/tags`,
    {
      fields: TAG_FIELDS,
      limit: "25",
      access_token: input.pageAccessToken,
    },
    (payload) => asRecordArray(payload.data),
    (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
    2,
  );

  if (!tagsResult.ok) {
    return { threads: [], messages: [], error: tagsResult.error, warning: null };
  }

  const threads: NormalizedInboxThread[] = [];
  const messages: NormalizedInboxMessage[] = [];

  for (const media of tagsResult.data) {
    const mediaId = readString(media.id);
    if (!mediaId) {
      continue;
    }

    const caption = readString(media.caption);
    const permalink = readString(media.permalink);
    const mediaUrl = readString(media.media_url);
    const mediaType = readString(media.media_type);
    const ownerUsername = readString(media.username);
    const sentAt = readIsoTime(media.timestamp);

    let resolvedMediaUrl = mediaUrl;
    if (!resolvedMediaUrl) {
      const mediaDetails = await inboxGraphGet<Record<string, unknown>>(`/${mediaId}`, {
        fields: "media_url,thumbnail_url",
        access_token: input.pageAccessToken,
      });
      if (mediaDetails.ok) {
        resolvedMediaUrl =
          readString(mediaDetails.data.media_url) ??
          readString(mediaDetails.data.thumbnail_url);
      }
    }

    const subject = caption ? snippet(caption, 80) : "Tagged Instagram post";
    const body = caption ?? "Tagged your organization on Instagram.";

    threads.push({
      channelType: "instagram_tag",
      externalThreadId: mediaId,
      externalPostId: mediaId,
      participantName: ownerUsername ? `@${ownerUsername}` : "Instagram user",
      participantExternalId: ownerUsername,
      subject,
      lastMessageSnippet: snippet(body),
      lastMessageAt: sentAt,
      metadata: {
        mediaId,
        permalink,
        mediaUrl: resolvedMediaUrl,
        mediaType,
        ownerUsername,
        tagged: true,
      },
    });

    messages.push({
      channelType: "instagram_tag",
      externalThreadId: mediaId,
      externalMessageId: mediaId,
      direction: "inbound",
      body,
      senderName: ownerUsername ? `@${ownerUsername}` : "Instagram user",
      senderExternalId: ownerUsername,
      sentAt,
      metadata: {
        mediaId,
        permalink,
        mediaUrl: resolvedMediaUrl,
        mediaType,
        ownerUsername,
        tagged: true,
      },
    });
  }

  if (threads.length === 0) {
    return {
      threads: [],
      messages: [],
      error: null,
      warning:
        "No Instagram tags found. When someone tags your business account, run Sync now to pull tagged posts.",
    };
  }

  return { threads, messages, error: null, warning: null };
}
