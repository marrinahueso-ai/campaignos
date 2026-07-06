import {
  asRecord,
  asRecordArray,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const MEDIA_FIELDS =
  "id,caption,timestamp,permalink,comments{id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}}";

function normalizeInstagramComment(input: {
  mediaId: string;
  mediaCaption: string | null;
  comment: Record<string, unknown>;
  threadExternalId: string;
  isReply?: boolean;
}): {
  thread: NormalizedInboxThread;
  message: NormalizedInboxMessage;
} | null {
  const externalMessageId = readString(input.comment.id);
  const body = readString(input.comment.text) ?? "";
  if (!externalMessageId) {
    return null;
  }

  const from = input.comment.from && typeof input.comment.from === "object"
    ? (input.comment.from as Record<string, unknown>)
    : null;
  const senderId = readString(from?.id);
  const senderName =
    readString(input.comment.username) ??
    readString(from?.username) ??
    "Instagram user";
  const sentAt = readIsoTime(input.comment.timestamp);

  return {
    thread: {
      channelType: "instagram_comment",
      externalThreadId: input.threadExternalId,
      externalPostId: input.mediaId,
      participantName: senderName,
      participantExternalId: senderId,
      subject: input.mediaCaption ? snippet(input.mediaCaption, 80) : "Instagram post",
      lastMessageSnippet: snippet(body),
      lastMessageAt: sentAt,
      metadata: {
        mediaId: input.mediaId,
        isReply: input.isReply ?? false,
      },
    },
    message: {
      channelType: "instagram_comment",
      externalThreadId: input.threadExternalId,
      externalMessageId,
      direction: "inbound",
      body,
      senderName,
      senderExternalId: senderId,
      sentAt,
      metadata: {
        mediaId: input.mediaId,
        isReply: input.isReply ?? false,
      },
    },
  };
}

export async function fetchInstagramMediaComments(input: {
  instagramAccountId: string;
  pageAccessToken: string;
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
}> {
  if (!input.instagramAccountId.trim()) {
    return {
      threads: [],
      messages: [],
      error: "Instagram account is not linked to this Page.",
    };
  }

  const mediaResult = await inboxGraphGetAllPages(
    `/${input.instagramAccountId}/media`,
    {
      fields: MEDIA_FIELDS,
      limit: "25",
      access_token: input.pageAccessToken,
    },
    (payload) => asRecordArray(payload.data),
    (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
    2,
  );

  if (!mediaResult.ok) {
    return { threads: [], messages: [], error: mediaResult.error };
  }

  const threadMap = new Map<string, NormalizedInboxThread>();
  const messages: NormalizedInboxMessage[] = [];

  for (const media of mediaResult.data) {
    const mediaId = readString(media.id);
    if (!mediaId) {
      continue;
    }

    const mediaCaption = readString(media.caption);
    const commentsContainer = asRecord(media.comments);
    const comments = asRecordArray(commentsContainer?.data ?? media.comments);

    for (const comment of comments) {
      const threadExternalId = `${mediaId}:${readString(comment.id) ?? "unknown"}`;
      const normalized = normalizeInstagramComment({
        mediaId,
        mediaCaption,
        comment,
        threadExternalId,
      });

      if (!normalized) {
        continue;
      }

      const existing = threadMap.get(threadExternalId);
      if (
        !existing ||
        (normalized.thread.lastMessageAt &&
          (!existing.lastMessageAt ||
            normalized.thread.lastMessageAt > existing.lastMessageAt))
      ) {
        threadMap.set(threadExternalId, normalized.thread);
      }

      messages.push(normalized.message);

      const repliesContainer = asRecord(comment.replies);
      const replies = asRecordArray(repliesContainer?.data ?? comment.replies);
      for (const reply of replies) {
        const replyThreadId = `${mediaId}:${readString(comment.id) ?? "unknown"}`;
        const replyNormalized = normalizeInstagramComment({
          mediaId,
          mediaCaption,
          comment: reply,
          threadExternalId: replyThreadId,
          isReply: true,
        });

        if (!replyNormalized) {
          continue;
        }

        const existingReplyThread = threadMap.get(replyThreadId);
        if (
          !existingReplyThread ||
          (replyNormalized.thread.lastMessageAt &&
            (!existingReplyThread.lastMessageAt ||
              replyNormalized.thread.lastMessageAt > existingReplyThread.lastMessageAt))
        ) {
          threadMap.set(replyThreadId, replyNormalized.thread);
        }

        messages.push(replyNormalized.message);
      }
    }

    if (comments.length === 0) {
      continue;
    }
  }

  return {
    threads: [...threadMap.values()],
    messages,
    error: null,
  };
}
