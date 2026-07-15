"use server";

import { revalidatePath } from "next/cache";
import { revalidateInboxRoutes } from "@/lib/inbox/revalidate-paths";
import { getAuthUser } from "@/lib/auth/queries";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { generateInboxAiDraft } from "@/lib/inbox/ai-draft";
import {
  getInboxMessageById,
  getInboxThreadById,
  getLatestReplyTarget,
} from "@/lib/inbox/message-queries";
import { canApproveReplyAnchor } from "@/lib/inbox/reply-target";
import { refreshInboxScopesFromPageToken, getOrganizationInboxSettings } from "@/lib/inbox/settings";
import { sendInboxReply } from "@/lib/inbox/send-reply";
import {
  missingFacebookCommentReplyScopes,
  missingInstagramCommentScopes,
} from "@/lib/inbox/scopes";
import { isReplyChannel, isTaggedChannel } from "@/lib/inbox/constants";
import { subscribeMetaInboxWebhooks } from "@/lib/inbox/sync/subscribe-webhooks";
import { syncInboxForOrganization } from "@/lib/inbox/sync/sync-organization";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  publishFacebookFeedPhoto,
  publishInstagramImage,
} from "@/lib/meta-publishing/graph-api";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";
import { createClient } from "@/lib/supabase/server";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";

export type InboxActionResult = {
  success: boolean;
  error?: string | null;
  warning?: string | null;
  threadsUpserted?: number;
  messagesUpserted?: number;
};

export type InboxReplyActionResult = {
  success: boolean;
  error?: string | null;
  draftBody?: string | null;
  aiSourceUsed?: InboxAiSourceUsed | null;
  status?: string | null;
};

export async function syncInboxNowAction(): Promise<InboxActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to sync inbox." };
  }

  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return { success: false, error: "Set up your organization first." };
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken) {
    return { success: false, error: "Connect your Facebook Page before syncing inbox." };
  }

  await refreshInboxScopesFromPageToken({
    organizationId: organization.id,
    pageAccessToken: connection.pageAccessToken,
    enableSync: true,
  });

  const subscribe = await subscribeMetaInboxWebhooks({
    pageId: connection.facebookPageId,
    instagramAccountId: connection.instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
  });

  const result = await syncInboxForOrganization(organization.id);

  if (!result.ok && result.error) {
    const subscribeNote = subscribe.error ? ` Webhook subscribe: ${subscribe.error}` : "";
    revalidateInboxRoutes();
    revalidatePath("/settings/meta");
    return {
      success: false,
      error: `${result.error}${subscribeNote}`,
      warning: result.warnings.length > 0 ? result.warnings.join(" | ") : null,
      threadsUpserted: result.threadsUpserted,
      messagesUpserted: result.messagesUpserted,
    };
  }

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return {
    success: true,
    warning: result.warnings.length > 0 ? result.warnings.join(" | ") : null,
    threadsUpserted: result.threadsUpserted,
    messagesUpserted: result.messagesUpserted,
  };
}

export async function subscribeInboxWebhooksAction(): Promise<InboxActionResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to manage inbox webhooks." };
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken) {
    return { success: false, error: "Connect your Facebook Page first." };
  }

  const subscribe = await subscribeMetaInboxWebhooks({
    pageId: connection.facebookPageId,
    instagramAccountId: connection.instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
  });

  if (!subscribe.ok) {
    return { success: false, error: subscribe.error };
  }

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return { success: true };
}

export type RefreshMetaTokenScopesResult = {
  success: boolean;
  error?: string | null;
  tokenValid?: boolean;
  tokenType?: string | null;
  grantedScopes?: string[];
  inboxRelevantScopes?: string[];
  missingFacebookCommentReplyScopes?: string[];
};

export async function refreshMetaTokenScopesAction(): Promise<RefreshMetaTokenScopesResult> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { success: false, error: "You do not have permission to refresh Meta token scopes." };
  }

  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return { success: false, error: "Set up your organization first." };
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken) {
    return { success: false, error: "Connect your Facebook Page first." };
  }

  const { getMetaTokenScopeDiagnostics } = await import("@/lib/inbox/settings");
  const diagnostics = await getMetaTokenScopeDiagnostics({
    pageAccessToken: connection.pageAccessToken,
  });

  await refreshInboxScopesFromPageToken({
    organizationId: organization.id,
    pageAccessToken: connection.pageAccessToken,
    enableSync: true,
  });

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");

  return {
    success: true,
    tokenValid: diagnostics.tokenValid,
    tokenType: diagnostics.tokenType,
    grantedScopes: diagnostics.grantedScopes,
    inboxRelevantScopes: diagnostics.inboxRelevantScopes,
    missingFacebookCommentReplyScopes: diagnostics.missingFacebookCommentReplyScopes,
  };
}

async function requireInboxPermission(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return { ok: false, error: "You do not have permission to manage inbox." };
  }

  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return { ok: false, error: "Set up your organization first." };
  }

  return { ok: true, organizationId: organization.id };
}

export async function generateInboxAiDraftAction(input: {
  threadId: string;
  messageId?: string | null;
  forceRegenerate?: boolean;
}): Promise<InboxReplyActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: input.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (!isReplyChannel(thread.channelType)) {
    return { success: false, error: "AI drafts are only available for reply threads." };
  }

  const replyMessage = input.messageId
    ? await getInboxMessageById({
        organizationId: access.organizationId,
        messageId: input.messageId,
      })
    : await getLatestReplyTarget({
        organizationId: access.organizationId,
        threadId: input.threadId,
      });

  if (!replyMessage) {
    return { success: false, error: "No message found to reply to in this thread." };
  }

  if (!canApproveReplyAnchor({ channelType: thread.channelType, message: replyMessage })) {
    return { success: false, error: "This message cannot be used as a reply target." };
  }

  const result = await generateInboxAiDraft({
    organizationId: access.organizationId,
    thread,
    inboundMessage: replyMessage,
    forceRegenerate: input.forceRegenerate,
  });

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return {
    success: result.success,
    error: result.error,
    draftBody: result.draftBody,
    aiSourceUsed: result.aiSourceUsed,
    status: "pending",
  };
}

export async function approveInboxReplyAction(input: {
  messageId: string;
  body: string;
}): Promise<InboxReplyActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const body = input.body.trim();
  if (!body) {
    return { success: false, error: "Reply body cannot be empty." };
  }

  const message = await getInboxMessageById({
    organizationId: access.organizationId,
    messageId: input.messageId,
  });
  if (!message) {
    return { success: false, error: "Message not found." };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: message.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (!canApproveReplyAnchor({ channelType: thread.channelType, message })) {
    return { success: false, error: "This message cannot be approved for reply." };
  }

  const user = await getAuthUser();
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inbox_messages")
    .update({
      approved_body: body,
      approved_at: now,
      approved_by_user_id: user?.id ?? null,
      status: "approved",
      updated_at: now,
    })
    .eq("id", input.messageId)
    .eq("organization_id", access.organizationId);

  if (error) {
    return { success: false, error: "Could not save approved reply." };
  }

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return { success: true, status: "approved" };
}

export async function sendInboxReplyAction(input: {
  messageId: string;
}): Promise<InboxReplyActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const message = await getInboxMessageById({
    organizationId: access.organizationId,
    messageId: input.messageId,
  });
  if (!message) {
    return { success: false, error: "Message not found." };
  }

  if (message.status !== "approved" || !message.approvedBody?.trim()) {
    return {
      success: false,
      error: "Approve the reply before sending.",
    };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: message.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (!isReplyChannel(thread.channelType)) {
    return { success: false, error: "This thread type does not support replies." };
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken || !connection.facebookPageId) {
    return { success: false, error: "Connect your Facebook Page before sending replies." };
  }

  const inboxSettings = await getOrganizationInboxSettings(access.organizationId);
  const grantedScopes = inboxSettings?.messagingScopesGranted ?? [];

  if (thread.channelType === "facebook_comment") {
    let grantedScopes = inboxSettings?.messagingScopesGranted ?? [];
    let missing = missingFacebookCommentReplyScopes(grantedScopes);

    if (missing.length > 0) {
      const refreshed = await refreshInboxScopesFromPageToken({
        organizationId: access.organizationId,
        pageAccessToken: connection.pageAccessToken,
      });
      grantedScopes = refreshed?.messagingScopesGranted ?? grantedScopes;
      missing = missingFacebookCommentReplyScopes(grantedScopes);
    }

    if (missing.length > 0) {
      return {
        success: false,
        error:
          "Cannot reply to Facebook comments — your stored Page token is missing pages_manage_engagement. " +
          "Adding the scope in Meta Developer Dashboard does not update an existing token. " +
          "Go to Settings → Meta and click Reconnect with Facebook to issue a new token with comment-reply permissions.",
      };
    }
  }

  if (thread.channelType === "instagram_comment") {
    const missing = missingInstagramCommentScopes(grantedScopes);
    if (missing.length > 0) {
      return {
        success: false,
        error:
          "Cannot reply to Instagram comments — missing instagram_manage_comments on your Page token. " +
          "Go to Settings → Meta and reconnect Facebook.",
      };
    }
  }

  const sendResult = await sendInboxReply({
    channelType: thread.channelType,
    thread,
    inboundMessage: message,
    body: message.approvedBody,
    pageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
    instagramAccountId: connection.instagramAccountId,
  });

  if (!sendResult.success) {
    return { success: false, error: sendResult.error };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error: inboundError } = await supabase
    .from("inbox_messages")
    .update({
      status: "sent",
      sent_to_platform_at: now,
      external_send_id: sendResult.externalSendId,
      updated_at: now,
    })
    .eq("id", message.id)
    .eq("organization_id", access.organizationId);

  if (inboundError) {
    return {
      success: false,
      error: "Reply was sent but could not update message status.",
    };
  }

  await supabase.from("inbox_messages").insert({
    organization_id: access.organizationId,
    thread_id: message.threadId,
    channel_type: message.channelType,
    external_message_id: sendResult.externalSendId ?? `local:${message.id}:${now}`,
    direction: "outbound",
    body: message.approvedBody,
    sender_name: connection.pageName ?? "You",
    sender_external_id: connection.facebookPageId,
    sent_at: now,
    status: "sent",
    sent_to_platform_at: now,
    external_send_id: sendResult.externalSendId,
    metadata: { replyToMessageId: message.id },
  });

  await supabase
    .from("inbox_threads")
    .update({
      status: "sent",
      last_message_snippet: message.approvedBody.slice(0, 120),
      last_message_at: now,
      updated_at: now,
    })
    .eq("id", thread.id)
    .eq("organization_id", access.organizationId);

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return { success: true, status: "sent" };
}

export async function repostTaggedPostAction(input: {
  threadId: string;
  caption?: string | null;
}): Promise<InboxReplyActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: input.threadId,
  });
  if (!thread || !isTaggedChannel(thread.channelType)) {
    return { success: false, error: "Tagged post not found." };
  }

  const mediaUrl =
    typeof thread.metadata.mediaUrl === "string" ? thread.metadata.mediaUrl : null;
  if (!mediaUrl) {
    return {
      success: false,
      error: "No media URL available for this tagged post. Try syncing from Meta settings.",
    };
  }

  const connection = await getMetaConnectionForCurrentOrg();
  if (!connection?.pageAccessToken || !connection.facebookPageId) {
    return { success: false, error: "Connect your Facebook Page before reposting." };
  }

  const caption = input.caption?.trim() || thread.lastMessageSnippet || "";

  let postId: string | null = null;
  let error: string | null = null;

  if (thread.channelType === "instagram_tag") {
    if (!connection.instagramAccountId) {
      return { success: false, error: "Link Instagram to your Page before reposting." };
    }

    const result = await publishInstagramImage({
      instagramAccountId: connection.instagramAccountId,
      accessToken: connection.pageAccessToken,
      imageUrl: mediaUrl,
      caption,
      mediaType: "FEED",
    });
    postId = result.postId;
    error = result.error;
  } else {
    const result = await publishFacebookFeedPhoto({
      pageId: connection.facebookPageId,
      accessToken: connection.pageAccessToken,
      imageUrl: mediaUrl,
      caption,
    });
    postId = result.postId;
    error = result.error;
  }

  if (!postId) {
    return { success: false, error: error ?? "Repost failed." };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  await supabase
    .from("inbox_threads")
    .update({
      status: "sent",
      metadata: {
        ...thread.metadata,
        repostedAt: now,
        repostPostId: postId,
      },
      updated_at: now,
    })
    .eq("id", thread.id)
    .eq("organization_id", access.organizationId);

  revalidateInboxRoutes();
  revalidatePath("/settings/meta");
  return { success: true, status: "sent" };
}

export async function markInboxThreadReadAction(input: {
  threadId: string;
}): Promise<InboxActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: input.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (thread.unreadCount <= 0) {
    return { success: true };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_threads")
    .update({
      unread_count: 0,
      updated_at: now,
    })
    .eq("id", input.threadId)
    .eq("organization_id", access.organizationId);

  if (error) {
    return { success: false, error: "Could not mark thread as read." };
  }

  revalidateInboxRoutes();
  return { success: true };
}

export async function archiveInboxThreadAction(input: {
  threadId: string;
}): Promise<InboxActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: input.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (thread.status === "archived") {
    return { success: true };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_threads")
    .update({
      status: "archived",
      unread_count: 0,
      updated_at: now,
    })
    .eq("id", input.threadId)
    .eq("organization_id", access.organizationId);

  if (error) {
    return { success: false, error: "Could not archive conversation." };
  }

  revalidateInboxRoutes();
  return { success: true };
}

export async function unarchiveInboxThreadAction(input: {
  threadId: string;
}): Promise<InboxActionResult> {
  const access = await requireInboxPermission();
  if (!access.ok) {
    return { success: false, error: access.error };
  }

  const thread = await getInboxThreadById({
    organizationId: access.organizationId,
    threadId: input.threadId,
  });
  if (!thread) {
    return { success: false, error: "Thread not found." };
  }

  if (thread.status !== "archived") {
    return { success: true };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_threads")
    .update({
      status: "pending",
      updated_at: now,
    })
    .eq("id", input.threadId)
    .eq("organization_id", access.organizationId);

  if (error) {
    return { success: false, error: "Could not move conversation out of archive." };
  }

  revalidateInboxRoutes();
  return { success: true };
}

export async function refreshInboxConnectionStatusAction(): Promise<{
  success: boolean;
  connection: import("@/lib/inbox/types").InboxConnectionStatus | null;
  error?: string | null;
}> {
  try {
    const { getLiveInboxConnectionStatus } = await import("@/lib/inbox/queries");
    const connection = await getLiveInboxConnectionStatus();
    return { success: true, connection };
  } catch (error) {
    return {
      success: false,
      connection: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not refresh Meta connection status.",
    };
  }
}
