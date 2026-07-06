import "server-only";

import { inboxGraphPost } from "@/lib/inbox/sync/graph-client";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";

export type SendInboxReplyInput = {
  channelType: InboxChannelType;
  thread: InboxThread;
  inboundMessage: InboxMessage;
  body: string;
  pageId: string;
  pageAccessToken: string;
  instagramAccountId?: string | null;
};

export type SendInboxReplyResult = {
  success: boolean;
  externalSendId: string | null;
  error: string | null;
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
        "Facebook denied this comment reply. Your Page token likely lacks pages_manage_engagement. " +
        "If you already set that permission to Ready for testing in Meta Developer Dashboard, you must still " +
        "click Reconnect with Facebook in Settings → Meta — dashboard changes do not update existing tokens. " +
        "If you use META_OAUTH_CONFIG_ID, add pages_manage_engagement to that Login for Business configuration too."
      );
    case "instagram_comment":
      return (
        "Instagram denied this comment reply. Reconnect Facebook in Settings → Meta to grant " +
        "instagram_manage_comments."
      );
    case "facebook_message":
      return (
        "Facebook Messenger denied this reply. Reconnect Facebook in Settings → Meta to grant " +
        "pages_messaging."
      );
    case "instagram_dm":
      return (
        "Instagram DM denied this reply. Reconnect Facebook in Settings → Meta to grant " +
        "instagram_manage_messages."
      );
    default:
      return input.graphError;
  }
}

async function sendFacebookMessengerReply(input: {
  channelType: "facebook_message" | "instagram_dm";
  pageId: string;
  recipientId: string;
  body: string;
  pageAccessToken: string;
}): Promise<SendInboxReplyResult> {
  const result = await inboxGraphPost<{ message_id?: string; id?: string }>(
    `/${input.pageId}/messages`,
    {
      recipient: JSON.stringify({ id: input.recipientId }),
      messaging_type: "RESPONSE",
      message: JSON.stringify({ text: input.body }),
      access_token: input.pageAccessToken,
    },
  );

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

  const externalSendId =
    String(result.data.message_id ?? result.data.id ?? "") || null;
  return { success: true, externalSendId, error: null };
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
  if (!body) {
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
