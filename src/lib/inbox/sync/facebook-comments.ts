import {
  buildCommentPostMetadata,
  resolveFacebookPostPermalink,
} from "@/lib/inbox/comment-post-preview";
import { missingFacebookCommentScopes } from "@/lib/inbox/scopes";
import {
  asRecord,
  asRecordArray,
  inboxGraphGetAllPages,
  readIsoTime,
  readString,
  snippet,
} from "@/lib/inbox/sync/graph-client";
import type { NormalizedInboxMessage, NormalizedInboxThread } from "@/lib/inbox/sync/types";

const POST_FIELDS = "id,message,created_time,permalink_url,full_picture,thumbnail_url";
const COMMENT_FIELDS = "id,message,from,created_time,comment_count";

function readGraphId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function buildFacebookCommentEmptyWarning(input: {
  pageId: string;
  missingScopes: string[];
  postsChecked: number;
  lastGraphError: string | null;
}): string {
  if (input.missingScopes.length > 0) {
    return `Missing token scopes: ${input.missingScopes.join(", ")}. Reconnect with inbox permissions.`;
  }

  const parts = [
    "Meta returned 0 Facebook post comments.",
    `Checked ${input.postsChecked} recent post(s) on Page ${input.pageId}.`,
    "Comment on a Page post, then run Sync now. Requires pages_read_user_content on the Page token.",
  ];

  if (input.lastGraphError) {
    parts.push(`Last Graph error: ${input.lastGraphError}`);
  }

  return parts.join(" ");
}

export async function fetchFacebookPostComments(input: {
  pageId: string;
  pageAccessToken: string;
  grantedScopes?: string[];
}): Promise<{
  threads: NormalizedInboxThread[];
  messages: NormalizedInboxMessage[];
  error: string | null;
  warning: string | null;
}> {
  const missingScopes = missingFacebookCommentScopes(input.grantedScopes ?? []);
  if (missingScopes.length > 0) {
    const error = `Missing token scopes for Facebook comments: ${missingScopes.join(", ")}.`;
    console.warn(`Facebook comment sync blocked for page ${input.pageId}: ${error}`);
    return {
      threads: [],
      messages: [],
      error,
      warning: null,
    };
  }

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
    return { threads: [], messages: [], error: postsResult.error, warning: null };
  }

  const threadMap = new Map<string, NormalizedInboxThread>();
  const messages: NormalizedInboxMessage[] = [];
  let lastGraphError: string | null = null;

  for (const post of postsResult.data) {
    const postId = readString(post.id);
    if (!postId) {
      continue;
    }

    const postMessage = readString(post.message);
    const graphPermalink = readString(post.permalink_url);
    const permalink = resolveFacebookPostPermalink({ postId, graphPermalink });
    const postImageUrl =
      readString(post.full_picture) ?? readString(post.thumbnail_url);
    const postMetadata = buildCommentPostMetadata({
      caption: postMessage,
      imageUrl: postImageUrl,
      permalink,
      postId,
    });

    const commentsResult = await inboxGraphGetAllPages(
      `/${postId}/comments`,
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
      console.warn(`Facebook comments fetch failed for post ${postId}:`, commentsResult.error);
      continue;
    }

    for (const comment of commentsResult.data) {
      const externalMessageId = readString(comment.id);
      const body = readString(comment.message) ?? "";
      if (!externalMessageId) {
        continue;
      }

      const from = asRecord(comment.from);
      const senderId = readGraphId(from?.id);
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
        metadata: postMetadata,
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
        direction:
          senderId && senderId === readGraphId(input.pageId) ? "outbound" : "inbound",
        body,
        senderName,
        senderExternalId: senderId,
        sentAt,
        metadata: postMetadata,
      });
    }
  }

  const threads = [...threadMap.values()];
  if (threads.length === 0) {
    const warning = buildFacebookCommentEmptyWarning({
      pageId: input.pageId,
      missingScopes,
      postsChecked: postsResult.data.length,
      lastGraphError,
    });
    console.warn("Facebook comment sync returned no comments:", warning);
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
