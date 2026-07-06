import { missingInstagramCommentScopes } from "@/lib/inbox/scopes";
import {
  asRecord,
  asRecordArray,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const MEDIA_FIELDS = "id,caption,timestamp,permalink";
const COMMENT_FIELDS =
  "id,text,timestamp,username,from{id,username},replies{id,text,timestamp,username,from{id,username}}";

function buildInstagramCommentEmptyWarning(input: {
  instagramAccountId: string;
  missingScopes: string[];
  mediaChecked: number;
  lastGraphError: string | null;
}): string {
  if (input.missingScopes.length > 0) {
    return `Missing token scopes: ${input.missingScopes.join(", ")}. Reconnect with inbox permissions.`;
  }

  const parts = [
    "Meta returned 0 Instagram comments.",
    `Checked ${input.mediaChecked} recent post(s) on IG account ${input.instagramAccountId}.`,
    "Comment on a linked IG post as a tester, then run Sync now. In Development mode, only app admins/testers can comment on test content.",
    "Requires instagram_manage_comments on the Page token.",
  ];

  if (input.lastGraphError) {
    parts.push(`Last Graph error: ${input.lastGraphError}`);
  }

  return parts.join(" ");
}

function normalizeInstagramComment(input: {
  mediaId: string;
  mediaCaption: string | null;
  mediaPermalink: string | null;
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

  const from =
    input.comment.from && typeof input.comment.from === "object"
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
        permalink: input.mediaPermalink,
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
        permalink: input.mediaPermalink,
        isReply: input.isReply ?? false,
      },
    },
  };
}

function ingestInstagramCommentsForMedia(input: {
  mediaId: string;
  mediaCaption: string | null;
  mediaPermalink: string | null;
  comments: Record<string, unknown>[];
  threadMap: Map<string, NormalizedInboxThread>;
  messages: NormalizedInboxMessage[];
}): void {
  for (const comment of input.comments) {
    const threadExternalId = `${input.mediaId}:${readString(comment.id) ?? "unknown"}`;
    const normalized = normalizeInstagramComment({
      mediaId: input.mediaId,
      mediaCaption: input.mediaCaption,
      mediaPermalink: input.mediaPermalink,
      comment,
      threadExternalId,
    });

    if (!normalized) {
      continue;
    }

    const existing = input.threadMap.get(threadExternalId);
    if (
      !existing ||
      (normalized.thread.lastMessageAt &&
        (!existing.lastMessageAt ||
          normalized.thread.lastMessageAt > existing.lastMessageAt))
    ) {
      input.threadMap.set(threadExternalId, normalized.thread);
    }

    input.messages.push(normalized.message);

    const repliesContainer = asRecord(comment.replies);
    const replies = asRecordArray(repliesContainer?.data ?? comment.replies);
    for (const reply of replies) {
      const replyThreadId = `${input.mediaId}:${readString(comment.id) ?? "unknown"}`;
      const replyNormalized = normalizeInstagramComment({
        mediaId: input.mediaId,
        mediaCaption: input.mediaCaption,
        mediaPermalink: input.mediaPermalink,
        comment: reply,
        threadExternalId: replyThreadId,
        isReply: true,
      });

      if (!replyNormalized) {
        continue;
      }

      const existingReplyThread = input.threadMap.get(replyThreadId);
      if (
        !existingReplyThread ||
        (replyNormalized.thread.lastMessageAt &&
          (!existingReplyThread.lastMessageAt ||
            replyNormalized.thread.lastMessageAt > existingReplyThread.lastMessageAt))
      ) {
        input.threadMap.set(replyThreadId, replyNormalized.thread);
      }

      input.messages.push(replyNormalized.message);
    }
  }
}

export async function fetchInstagramMediaComments(input: {
  instagramAccountId: string;
  pageAccessToken: string;
  grantedScopes?: string[];
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

  const missingScopes = missingInstagramCommentScopes(input.grantedScopes ?? []);
  if (missingScopes.length > 0) {
    const error = `Missing token scopes for Instagram comments: ${missingScopes.join(", ")}.`;
    console.warn(`Instagram comment sync blocked for IG ${instagramAccountId}: ${error}`);
    return {
      threads: [],
      messages: [],
      error,
      warning: null,
    };
  }

  const mediaResult = await inboxGraphGetAllPages(
    `/${instagramAccountId}/media`,
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
    return { threads: [], messages: [], error: mediaResult.error, warning: null };
  }

  const threadMap = new Map<string, NormalizedInboxThread>();
  const messages: NormalizedInboxMessage[] = [];
  let lastGraphError: string | null = null;

  for (const media of mediaResult.data) {
    const mediaId = readString(media.id);
    if (!mediaId) {
      continue;
    }

    const mediaCaption = readString(media.caption);
    const mediaPermalink = readString(media.permalink);

    const commentsResult = await inboxGraphGetAllPages(
      `/${mediaId}/comments`,
      {
        fields: COMMENT_FIELDS,
        limit: "50",
        access_token: input.pageAccessToken,
      },
      (payload) => asRecordArray(payload.data),
      (payload) => readString(payload.paging && asRecord(payload.paging)?.next) ?? null,
      2,
    );

    if (!commentsResult.ok) {
      lastGraphError = commentsResult.error;
      console.warn(
        `Instagram comments fetch failed for media ${mediaId}:`,
        commentsResult.error,
      );
      continue;
    }

    ingestInstagramCommentsForMedia({
      mediaId,
      mediaCaption,
      mediaPermalink,
      comments: commentsResult.data,
      threadMap,
      messages,
    });
  }

  const threads = [...threadMap.values()];
  if (threads.length === 0) {
    const warning = buildInstagramCommentEmptyWarning({
      instagramAccountId,
      missingScopes,
      mediaChecked: mediaResult.data.length,
      lastGraphError,
    });
    console.warn("Instagram comment sync returned no comments:", warning);
    return {
      threads: [],
      messages: [],
      error: lastGraphError,
      warning,
    };
  }

  return {
    threads,
    messages,
    error: null,
    warning: null,
  };
}
