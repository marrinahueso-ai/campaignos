import "server-only";

import { isCommentChannel } from "@/lib/inbox/constants";
import {
  buildMessengerSendParams,
  looksLikeReplyToFailure,
} from "@/lib/inbox/messenger-send-params";
import { inboxGraphPost } from "@/lib/inbox/sync/graph-client";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";

export type SendInboxReplyInput = {
  channelType: InboxChannelType;
  thread: InboxThread;
  inboundMessage: InboxMessage;
  body: string;
  /** Public HTTPS URL for a custom sticker / image attachment (DMs only). */
  imageUrl?: string | null;
  /**
   * Meta message mid to reply-quote (Messenger / IG DM `reply_to`).
   * Ignored for comment channels (those already reply under the comment id).
   */
  replyToExternalMessageId?: string | null;
  pageId: string;
  pageAccessToken: string;
  instagramAccountId?: string | null;
};

export type SendInboxReplyResult = {
  success: boolean;
  externalSendId: string | null;
  error: string | null;
  /** Set when an image attachment was delivered via Meta. */
  sentImage?: boolean;
};

function formatSendReplyError(input: {
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
        "Facebook blocked this comment reply. Go to Settings → Meta and click Reconnect with Facebook " +
        "so comment replies are allowed, then try again."
      );
    case "instagram_comment":
      return (
        "Instagram blocked this comment reply. Go to Settings → Meta and reconnect Facebook, " +
        "then try again."
      );
    case "facebook_message":
      return (
        "Messenger blocked this reply. Go to Settings → Meta and reconnect Facebook, then try again."
      );
    case "instagram_dm":
      return (
        "Instagram blocked this DM reply. Go to Settings → Meta and reconnect Facebook, then try again."
      );
    default:
      return input.graphError;
  }
}

async function postMessengerMessage(input: {
  channelType: "facebook_message" | "instagram_dm";
  pageId: string;
  recipientId: string;
  message: Record<string, unknown>;
  replyToMid: string | null;
  pageAccessToken: string;
}): Promise<SendInboxReplyResult> {
  const path = `/${input.pageId}/messages`;
  const withQuote = buildMessengerSendParams({
    recipientId: input.recipientId,
    message: input.message,
    replyToMid: input.replyToMid,
    pageAccessToken: input.pageAccessToken,
  });

  let result = await inboxGraphPost<{ message_id?: string; id?: string }>(
    path,
    withQuote,
  );

  // Soft fallback: invalid/expired mid must not block the reply itself.
  if (
    !result.ok &&
    input.replyToMid &&
    looksLikeReplyToFailure(result.error, result.errorCode)
  ) {
    result = await inboxGraphPost<{ message_id?: string; id?: string }>(
      path,
      buildMessengerSendParams({
        recipientId: input.recipientId,
        message: input.message,
        replyToMid: null,
        pageAccessToken: input.pageAccessToken,
      }),
    );
  }

  if (!result.ok) {
    return {
      success: false,
      externalSendId: null,
      error: formatSendReplyError({
        channelType: input.channelType,
        graphError: result.error,
        errorCode: result.errorCode,
      }),
    };
  }

  return {
    success: true,
    externalSendId:
      String(result.data.message_id ?? result.data.id ?? "") || null,
    error: null,
  };
}

async function sendFacebookMessengerReply(input: {
  channelType: "facebook_message" | "instagram_dm";
  pageId: string;
  recipientId: string;
  body: string;
  imageUrl?: string | null;
  replyToExternalMessageId?: string | null;
  pageAccessToken: string;
}): Promise<SendInboxReplyResult> {
  const imageUrl = input.imageUrl?.trim() || null;
  const body = input.body.trim();
  const replyToMid = input.replyToExternalMessageId?.trim() || null;

  if (!imageUrl && !body) {
    return {
      success: false,
      externalSendId: null,
      error: "Reply body is empty.",
    };
  }

  let lastExternalSendId: string | null = null;
  let sentImage = false;

  if (imageUrl) {
    const imageResult = await postMessengerMessage({
      channelType: input.channelType,
      pageId: input.pageId,
      recipientId: input.recipientId,
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true,
          },
        },
      },
      // Only attach reply_to to the first payload so sticker+text doesn’t double-quote.
      replyToMid,
      pageAccessToken: input.pageAccessToken,
    });

    if (!imageResult.success) {
      return imageResult;
    }

    lastExternalSendId = imageResult.externalSendId;
    sentImage = true;
  }

  if (body) {
    const textResult = await postMessengerMessage({
      channelType: input.channelType,
      pageId: input.pageId,
      recipientId: input.recipientId,
      message: { text: body },
      replyToMid: sentImage ? null : replyToMid,
      pageAccessToken: input.pageAccessToken,
    });

    if (!textResult.success) {
      // Image may already have been delivered — surface the text failure clearly.
      const prefix = sentImage
        ? "Sticker was sent, but the text reply failed: "
        : "";
      return {
        success: false,
        externalSendId: lastExternalSendId,
        sentImage,
        error: prefix + (textResult.error ?? "Text reply failed."),
      };
    }

    lastExternalSendId = textResult.externalSendId ?? lastExternalSendId;
  }

  return {
    success: true,
    externalSendId: lastExternalSendId,
    error: null,
    sentImage,
  };
}

async function sendFacebookCommentReply(input: {
  commentId: string;
  body: string;
  pageAccessToken: string;
}): Promise<SendInboxReplyResult> {
  const result = await inboxGraphPost<{ id?: string }>(`/${input.commentId}/comments`, {
    message: input.body,
    access_token: input.pageAccessToken,
  });

  if (!result.ok) {
    return {
      success: false,
      externalSendId: null,
      error: formatSendReplyError({
        channelType: "facebook_comment",
        graphError: result.error,
        errorCode: result.errorCode,
      }),
    };
  }

  const externalSendId = String(result.data.id ?? "") || null;
  return { success: true, externalSendId, error: null };
}

async function sendInstagramCommentReply(input: {
  commentId: string;
  body: string;
  pageAccessToken: string;
}): Promise<SendInboxReplyResult> {
  const result = await inboxGraphPost<{ id?: string }>(`/${input.commentId}/replies`, {
    message: input.body,
    access_token: input.pageAccessToken,
  });

  if (!result.ok) {
    return {
      success: false,
      externalSendId: null,
      error: formatSendReplyError({
        channelType: "instagram_comment",
        graphError: result.error,
        errorCode: result.errorCode,
      }),
    };
  }

  const externalSendId = String(result.data.id ?? "") || null;
  return { success: true, externalSendId, error: null };
}

export async function sendInboxReply(
  input: SendInboxReplyInput,
): Promise<SendInboxReplyResult> {
  const body = input.body.trim();
  const imageUrl = input.imageUrl?.trim() || null;

  if (imageUrl && isCommentChannel(input.channelType)) {
    return {
      success: false,
      externalSendId: null,
      error:
        "Image stickers can’t be sent as comment replies — Meta only accepts text on comments. Use Messenger or Instagram DMs, or paste text instead.",
    };
  }

  if (!body && !imageUrl) {
    return { success: false, externalSendId: null, error: "Reply body is empty." };
  }

  switch (input.channelType) {
    case "facebook_message": {
      const recipientId =
        input.thread.participantExternalId ??
        input.inboundMessage.senderExternalId;
      if (!recipientId) {
        return {
          success: false,
          externalSendId: null,
          error: "Could not determine the Facebook Messenger recipient.",
        };
      }

      return sendFacebookMessengerReply({
        channelType: "facebook_message",
        pageId: input.pageId,
        recipientId,
        body,
        imageUrl,
        replyToExternalMessageId: input.replyToExternalMessageId,
        pageAccessToken: input.pageAccessToken,
      });
    }

    case "instagram_dm": {
      const recipientId =
        input.thread.participantExternalId ??
        input.inboundMessage.senderExternalId;
      if (!recipientId) {
        return {
          success: false,
          externalSendId: null,
          error: "Could not determine the Instagram DM recipient.",
        };
      }

      return sendFacebookMessengerReply({
        channelType: "instagram_dm",
        pageId: input.pageId,
        recipientId,
        body,
        imageUrl,
        replyToExternalMessageId: input.replyToExternalMessageId,
        pageAccessToken: input.pageAccessToken,
      });
    }

    case "facebook_comment":
      return sendFacebookCommentReply({
        commentId: input.inboundMessage.externalMessageId,
        body,
        pageAccessToken: input.pageAccessToken,
      });

    case "instagram_comment":
      return sendInstagramCommentReply({
        commentId: input.inboundMessage.externalMessageId,
        body,
        pageAccessToken: input.pageAccessToken,
      });

    default:
      return {
        success: false,
        externalSendId: null,
        error: `Replies are not supported for ${input.channelType}.`,
      };
  }
}
