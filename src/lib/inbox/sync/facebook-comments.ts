import {
  asRecord,
  asRecordArray,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const POST_FIELDS =
  "id,message,created_time,permalink_url,comments{id,message,from,created_time,comment_count}";

export async function fetchFacebookPostComments(input: {
  pageId: string;
  pageAccessToken: string;
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
}> {
  const postsResult = await inboxGraphGetAllPages(
    `/${input.pageId}/posts`,
    {
      fields: POST_FIELDS,
      limit: "25",
      access_token: input.pageAccessToken,
    },
    (payload) => asRecordArray(payload.data),
    (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
    2,
  );

  if (!postsResult.ok) {
    return { threads: [], messages: [], error: postsResult.error };
  }

  const threadMap = new Map<string, NormalizedInboxThread>();
  const messages: NormalizedInboxMessage[] = [];

  for (const post of postsResult.data) {
    const postId = readString(post.id);
    if (!postId) {
      continue;
    }

    const postMessage = readString(post.message);
    const commentsContainer = asRecord(post.comments);
    const comments = asRecordArray(commentsContainer?.data ?? post.comments);

    for (const comment of comments) {
      const externalMessageId = readString(comment.id);
      const body = readString(comment.message) ?? "";
      if (!externalMessageId) {
        continue;
      }

      const from = asRecord(comment.from);
      const senderId = readString(from?.id);
      const senderName = readString(from?.name) ?? "Facebook user";
      const sentAt = readIsoTime(comment.created_time);
      const threadExternalId = `${postId}:${externalMessageId}`;

      const thread: NormalizedInboxThread = {
        channelType: "facebook_comment",
        externalThreadId: threadExternalId,
        externalPostId: postId,
        participantName: senderName,
        participantExternalId: senderId,
        subject: postMessage ? snippet(postMessage, 80) : "Facebook post",
        lastMessageSnippet: snippet(body),
        lastMessageAt: sentAt,
        metadata: {
          postId,
          permalink: readString(post.permalink_url),
        },
      };

      const existing = threadMap.get(threadExternalId);
      if (
        !existing ||
        (thread.lastMessageAt &&
          (!existing.lastMessageAt || thread.lastMessageAt > existing.lastMessageAt))
      ) {
        threadMap.set(threadExternalId, thread);
      }

      messages.push({
        channelType: "facebook_comment",
        externalThreadId: threadExternalId,
        externalMessageId,
        direction: senderId === input.pageId ? "outbound" : "inbound",
        body,
        senderName,
        senderExternalId: senderId,
        sentAt,
        metadata: {
          postId,
        },
      });
    }
  }

  return {
    threads: [...threadMap.values()],
    messages,
    error: null,
  };
}
