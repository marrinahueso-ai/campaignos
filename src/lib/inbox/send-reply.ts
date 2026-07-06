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

async function sendFacebookMessengerReply(input: {
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
    return { success: false, externalSendId: null, error: result.error };
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
    return { success: false, externalSendId: null, error: result.error };
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
    return { success: false, externalSendId: null, error: result.error };
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
