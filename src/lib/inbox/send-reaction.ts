import "server-only";

import { isCommentChannel, isReplyChannel } from "@/lib/inbox/constants";
import type { BubbleQuickReaction } from "@/lib/inbox/stickers";
import {
  inboxGraphDelete,
  inboxGraphPost,
} from "@/lib/inbox/sync/graph-client";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";

export type SendInboxReactionInput = {
  channelType: InboxChannelType;
  thread: InboxThread;
  message: InboxMessage;
  /** Emoji to apply, or null to remove the Page/IG reaction. */
  reaction: BubbleQuickReaction | null;
  pageId: string;
  pageAccessToken: string;
  instagramAccountId?: string | null;
};

export type SendInboxReactionResult = {
  success: boolean;
  error: string | null;
  /** What Meta actually applied (`LIKE` for comments, emoji for DMs). */
  metaReaction: "LIKE" | BubbleQuickReaction | null;
  /** True when ❤️ was posted as a Graph LIKE (comments only support Like). */
  mappedToLike: boolean;
  /** No Meta edge exists for this channel — caller may persist hub-only. */
  localOnly: boolean;
};

/** Meta returns an error when liking an already-liked comment (or unliking when not liked). */
export function isBenignCommentLikeStateError(graphError: string): boolean {
  const lower = graphError.toLowerCase();
  return (
    lower.includes("already been liked") ||
    lower.includes("already liked") ||
    lower.includes("has not been liked") ||
    lower.includes("not been liked") ||
    lower.includes("user hasn't liked")
  );
}

function formatReactionError(input: {
  channelType: InboxChannelType;
  graphError: string;
  errorCode?: number;
}): string {
  const isPermissionError =
    input.errorCode === 200 ||
    input.graphError.includes("Permissions error") ||
    input.graphError.includes("OAuthException");

  if (!isPermissionError) {
    return input.graphError;
  }

  switch (input.channelType) {
    case "facebook_comment":
      return (
        "Facebook denied liking this comment. Reconnect Facebook in Settings → Meta so the Page token includes pages_manage_engagement."
      );
    case "instagram_comment":
      return (
        "Instagram denied liking this comment. Reconnect Facebook in Settings → Meta to grant instagram_manage_engagement (in addition to instagram_manage_comments)."
      );
    case "facebook_message":
      return (
        "Facebook Messenger denied this reaction. Reconnect Facebook in Settings → Meta to grant pages_messaging."
      );
    case "instagram_dm":
      return (
        "Instagram DM denied this reaction. Reconnect Facebook in Settings → Meta to grant instagram_manage_messages."
      );
    default:
      return input.graphError;
  }
}

async function likeFacebookComment(input: {
  commentId: string;
  pageAccessToken: string;
  remove: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; errorCode?: number }> {
  if (input.remove) {
    const result = await inboxGraphDelete<{ success?: boolean }>(
      `/${input.commentId}/likes`,
      { access_token: input.pageAccessToken },
    );
    if (!result.ok) {
      return { ok: false, error: result.error, errorCode: result.errorCode };
    }
    return { ok: true };
  }

  const result = await inboxGraphPost<{ success?: boolean }>(
    `/${input.commentId}/likes`,
    { access_token: input.pageAccessToken },
  );
  if (!result.ok) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }
  return { ok: true };
}

async function likeInstagramComment(input: {
  igUserId: string;
  commentId: string;
  pageAccessToken: string;
  remove: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; errorCode?: number }> {
  const params = {
    comment_id: input.commentId,
    access_token: input.pageAccessToken,
  };

  if (input.remove) {
    const result = await inboxGraphDelete<{ success?: boolean }>(
      `/${input.igUserId}/likes`,
      params,
    );
    if (!result.ok) {
      return { ok: false, error: result.error, errorCode: result.errorCode };
    }
    return { ok: true };
  }

  const result = await inboxGraphPost<{ success?: boolean }>(
    `/${input.igUserId}/likes`,
    params,
  );
  if (!result.ok) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }
  return { ok: true };
}

async function reactToMessengerMessage(input: {
  channelType: "facebook_message" | "instagram_dm";
  pageId: string;
  recipientId: string;
  messageId: string;
  reaction: BubbleQuickReaction | null;
  pageAccessToken: string;
}): Promise<{ ok: true } | { ok: false; error: string; errorCode?: number }> {
  const params: Record<string, string> = {
    recipient: JSON.stringify({ id: input.recipientId }),
    sender_action: input.reaction ? "react" : "unreact",
    access_token: input.pageAccessToken,
  };

  if (input.reaction) {
    params.payload = JSON.stringify({
      message_id: input.messageId,
      reaction: input.reaction,
    });
  } else {
    params.payload = JSON.stringify({
      message_id: input.messageId,
    });
  }

  const result = await inboxGraphPost<{ recipient_id?: string }>(
    `/${input.pageId}/messages`,
    params,
  );

  if (!result.ok) {
    return { ok: false, error: result.error, errorCode: result.errorCode };
  }
  return { ok: true };
}

/** Comment Graph edges only support Like — both hub emojis map to LIKE. */
export function commentReactionMapsToLike(
  reaction: BubbleQuickReaction | null,
): boolean {
  return reaction === "❤️";
}

export function channelSupportsMetaReaction(
  channelType: InboxChannelType,
): boolean {
  return isReplyChannel(channelType);
}

/**
 * Apply or remove a Page/IG reaction on Meta for an inbox bubble.
 * Facebook/Instagram comments → LIKE only. Messenger/IG DMs → emoji react.
 * Tagged threads have no Meta reaction edge (local-only).
 */
export async function sendInboxReaction(
  input: SendInboxReactionInput,
): Promise<SendInboxReactionResult> {
  if (!channelSupportsMetaReaction(input.channelType)) {
    return {
      success: true,
      error: null,
      metaReaction: null,
      mappedToLike: false,
      localOnly: true,
    };
  }

  const externalMessageId = input.message.externalMessageId?.trim();
  if (!externalMessageId || externalMessageId.startsWith("local:")) {
    return {
      success: false,
      error: "This message has no Meta id yet, so a reaction can’t be posted to Facebook/Instagram.",
      metaReaction: null,
      mappedToLike: false,
      localOnly: false,
    };
  }

  if (isCommentChannel(input.channelType)) {
    const mappedToLike = commentReactionMapsToLike(input.reaction);
    const metaReaction = input.reaction ? ("LIKE" as const) : null;

    if (input.channelType === "facebook_comment") {
      const result = await likeFacebookComment({
        commentId: externalMessageId,
        pageAccessToken: input.pageAccessToken,
        remove: input.reaction == null,
      });
      if (!result.ok && !isBenignCommentLikeStateError(result.error)) {
        return {
          success: false,
          error: formatReactionError({
            channelType: "facebook_comment",
            graphError: result.error,
            errorCode: result.errorCode,
          }),
          metaReaction: null,
          mappedToLike,
          localOnly: false,
        };
      }
      return {
        success: true,
        error: null,
        metaReaction,
        mappedToLike,
        localOnly: false,
      };
    }

    const igUserId = input.instagramAccountId?.trim();
    if (!igUserId) {
      return {
        success: false,
        error: "Connect an Instagram professional account before liking Instagram comments.",
        metaReaction: null,
        mappedToLike,
        localOnly: false,
      };
    }

    const result = await likeInstagramComment({
      igUserId,
      commentId: externalMessageId,
      pageAccessToken: input.pageAccessToken,
      remove: input.reaction == null,
    });
    if (!result.ok && !isBenignCommentLikeStateError(result.error)) {
      return {
        success: false,
        error: formatReactionError({
          channelType: "instagram_comment",
          graphError: result.error,
          errorCode: result.errorCode,
        }),
        metaReaction: null,
        mappedToLike,
        localOnly: false,
      };
    }
    return {
      success: true,
      error: null,
      metaReaction,
      mappedToLike,
      localOnly: false,
    };
  }

  if (
    input.channelType === "facebook_message" ||
    input.channelType === "instagram_dm"
  ) {
    const recipientId =
      input.thread.participantExternalId ??
      (input.message.direction === "inbound"
        ? input.message.senderExternalId
        : null);

    if (!recipientId) {
      return {
        success: false,
        error: "Could not determine the conversation recipient for this reaction.",
        metaReaction: null,
        mappedToLike: false,
        localOnly: false,
      };
    }

    const result = await reactToMessengerMessage({
      channelType: input.channelType,
      pageId: input.pageId,
      recipientId,
      messageId: externalMessageId,
      reaction: input.reaction,
      pageAccessToken: input.pageAccessToken,
    });

    if (!result.ok) {
      return {
        success: false,
        error: formatReactionError({
          channelType: input.channelType,
          graphError: result.error,
          errorCode: result.errorCode,
        }),
        metaReaction: null,
        mappedToLike: false,
        localOnly: false,
      };
    }

    return {
      success: true,
      error: null,
      metaReaction: input.reaction,
      mappedToLike: false,
      localOnly: false,
    };
  }

  return {
    success: true,
    error: null,
    metaReaction: null,
    mappedToLike: false,
    localOnly: true,
  };
}
