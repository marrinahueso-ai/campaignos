import {
  buildCommentPostMetadata,
  resolveFacebookPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import {
  asRecord,
  asRecordArray,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const TAGGED_POST_FIELDS =
  "id,message,created_time,permalink_url,full_picture,from{id,name}";

export async function fetchFacebookTaggedPosts(input: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
  warning: string | null;
}> {
  const taggedResult = await inboxGraphGetAllPages(
    `/${input.pageId}/tagged`,
    {
      fields: TAGGED_POST_FIELDS,
      limit: "25",
      access_token: input.pageAccessToken,
    },
    (payload) => asRecordArray(payload.data),
    (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
    2,
  );

  if (!taggedResult.ok) {
    return { threads: [], messages: [], error: taggedResult.error, warning: null };
  }

  const threads: NormalizedInboxThread[] = [];
  const messages: NormalizedInboxMessage[] = [];

  for (const post of taggedResult.data) {
    const postId = readString(post.id);
    if (!postId) {
      continue;
    }

    const message = readString(post.message);
    const graphPermalink = readString(post.permalink_url);
    const permalink = resolveFacebookPostPermalink({ postId, graphPermalink });
    const mediaUrl = readString(post.full_picture);
    const sentAt = readIsoTime(post.created_time);
    const from = asRecord(post.from);
    const senderName = readString(from?.name) ?? "Facebook user";
    const senderId = readString(from?.id);

    const subject = message ? snippet(message, 80) : "Tagged Facebook post";
    const body = message ?? "Tagged your Page on Facebook.";
    const postMetadata = buildCommentPostMetadata({
      caption: message,
      imageUrl: mediaUrl,
      permalink,
      postId,
      publishedAt: sentAt,
      extra: {
        mediaUrl,
        tagged: true,
      },
    });

    threads.push({
      channelType: "facebook_tag",
      externalThreadId: postId,
      externalPostId: postId,
      participantName: senderName,
      participantExternalId: senderId,
      subject,
      lastMessageSnippet: snippet(body),
      lastMessageAt: sentAt,
      metadata: postMetadata,
    });

    messages.push({
      channelType: "facebook_tag",
      externalThreadId: postId,
      externalMessageId: postId,
      direction: "inbound",
      body,
      senderName,
      senderExternalId: senderId,
      sentAt,
      metadata: postMetadata,
    });
  }

  if (threads.length === 0) {
    return {
      threads: [],
      messages: [],
      error: null,
      warning:
        "No Facebook tags found. When someone tags your Page, run Sync now to pull tagged posts.",
    };
  }

  return { threads, messages, error: null, warning: null };
}
