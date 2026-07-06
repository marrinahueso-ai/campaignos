import "server-only";

import { getMetaConnectionForOrganization } from "@/lib/meta-publishing/connection";
import { upsertOrganizationInboxSettings } from "@/lib/inbox/settings";
import { fetchFacebookPostComments } from "@/lib/inbox/sync/facebook-comments";
import { fetchFacebookPageMessages } from "@/lib/inbox/sync/facebook-messages";
import { fetchInstagramMediaComments } from "@/lib/inbox/sync/instagram-comments";
import { fetchInstagramDirectMessages } from "@/lib/inbox/sync/instagram-dms";
import type { InboxSyncChannelResult, InboxSyncResult } from "@/lib/inbox/sync/types";
import { upsertInboxBatch } from "@/lib/inbox/sync/upsert";

export async function syncInboxForOrganization(
  organizationId: string,
): Promise<InboxSyncResult> {
  const connection = await getMetaConnectionForOrganization(organizationId);

  if (!connection?.pageAccessToken || !connection.facebookPageId) {
    const error = "Meta Page connection is required before inbox sync.";
    await upsertOrganizationInboxSettings({
      organizationId,
      lastSyncError: error,
    });

    return {
      ok: false,
      threadsUpserted: 0,
      messagesUpserted: 0,
      channels: [],
      error,
    };
  }

  const channelResults: InboxSyncChannelResult[] = [];
  const allThreads = [];
  const allMessages = [];
  const errors: string[] = [];

  const facebookMessages = await fetchFacebookPageMessages({
    pageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
    pageName: connection.pageName,
  });
  channelResults.push({
    channel: "facebook_message",
    threadsFound: facebookMessages.threads.length,
    messagesFound: facebookMessages.messages.length,
    error: facebookMessages.error,
  });
  if (facebookMessages.error) {
    errors.push(`Facebook messages: ${facebookMessages.error}`);
  } else {
    allThreads.push(...facebookMessages.threads);
    allMessages.push(...facebookMessages.messages);
  }

  const instagramDms = await fetchInstagramDirectMessages({
    pageId: connection.facebookPageId,
    instagramAccountId: connection.instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
  });
  channelResults.push({
    channel: "instagram_dm",
    threadsFound: instagramDms.threads.length,
    messagesFound: instagramDms.messages.length,
    error: instagramDms.error,
  });
  if (instagramDms.error) {
    errors.push(`Instagram DMs: ${instagramDms.error}`);
  } else {
    allThreads.push(...instagramDms.threads);
    allMessages.push(...instagramDms.messages);
  }

  const instagramComments = await fetchInstagramMediaComments({
    instagramAccountId: connection.instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
  });
  channelResults.push({
    channel: "instagram_comment",
    threadsFound: instagramComments.threads.length,
    messagesFound: instagramComments.messages.length,
    error: instagramComments.error,
  });
  if (instagramComments.error) {
    errors.push(`Instagram comments: ${instagramComments.error}`);
  } else {
    allThreads.push(...instagramComments.threads);
    allMessages.push(...instagramComments.messages);
  }

  const facebookComments = await fetchFacebookPostComments({
    pageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
  });
  channelResults.push({
    channel: "facebook_comment",
    threadsFound: facebookComments.threads.length,
    messagesFound: facebookComments.messages.length,
    error: facebookComments.error,
  });
  if (facebookComments.error) {
    errors.push(`Facebook comments: ${facebookComments.error}`);
  } else {
    allThreads.push(...facebookComments.threads);
    allMessages.push(...facebookComments.messages);
  }

  const upserted = await upsertInboxBatch({
    organizationId,
    threads: allThreads,
    messages: allMessages,
  });

  const hasData = upserted.threadsUpserted > 0 || upserted.messagesUpserted > 0;
  const allFailed = channelResults.every((channel) => channel.error && channel.threadsFound === 0);
  const syncError =
    allFailed && errors.length > 0 ? errors.join(" | ") : errors.length > 0 ? errors.join(" | ") : null;

  await upsertOrganizationInboxSettings({
    organizationId,
    syncEnabled: hasData || errors.length < channelResults.length,
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: allFailed ? syncError : errors.length > 0 ? syncError : null,
  });

  return {
    ok: !allFailed,
    threadsUpserted: upserted.threadsUpserted,
    messagesUpserted: upserted.messagesUpserted,
    channels: channelResults,
    error: allFailed ? syncError : null,
  };
}

export async function syncAllOrganizationsInbox(): Promise<{
  organizationsProcessed: number;
  results: Array<{ organizationId: string; result: InboxSyncResult }>;
}> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("organization_meta_connections")
    .select("organization_id");

  if (error || !data) {
    return { organizationsProcessed: 0, results: [] };
  }

  const results: Array<{ organizationId: string; result: InboxSyncResult }> = [];

  for (const row of data) {
    const organizationId = row.organization_id as string;
    const result = await syncInboxForOrganization(organizationId);
    results.push({ organizationId, result });
  }

  return {
    organizationsProcessed: results.length,
    results,
  };
}
