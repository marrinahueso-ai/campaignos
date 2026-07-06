import "server-only";

import {
  getMetaConnectionForOrganization,
  refreshOrganizationInstagramAccountId,
} from "@/lib/meta-publishing/connection";
import { getOrganizationInboxSettings, upsertOrganizationInboxSettings } from "@/lib/inbox/settings";
import { fetchFacebookPostComments } from "@/lib/inbox/sync/facebook-comments";
import { fetchFacebookPageMessages } from "@/lib/inbox/sync/facebook-messages";
import { fetchInstagramMediaComments } from "@/lib/inbox/sync/instagram-comments";
import { fetchInstagramDirectMessages } from "@/lib/inbox/sync/instagram-dms";
import type { InboxSyncChannelResult, InboxSyncResult } from "@/lib/inbox/sync/types";
import { upsertInboxBatch } from "@/lib/inbox/sync/upsert";

function channelResult(
  partial: Omit<InboxSyncChannelResult, "warning"> & { warning?: string | null },
): InboxSyncChannelResult {
  return {
    ...partial,
    warning: partial.warning ?? null,
  };
}

export async function syncInboxForOrganization(
  organizationId: string,
): Promise<InboxSyncResult> {
  const connection = await getMetaConnectionForOrganization(organizationId);
  const inboxSettings = await getOrganizationInboxSettings(organizationId);
  const grantedScopes = inboxSettings?.messagingScopesGranted ?? [];

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
      warnings: [],
    };
  }

  const instagramAccountId = await refreshOrganizationInstagramAccountId({
    organizationId,
    facebookPageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
    instagramAccountId: connection.instagramAccountId,
  });

  const channelResults: InboxSyncChannelResult[] = [];
  const allThreads = [];
  const allMessages = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const facebookMessages = await fetchFacebookPageMessages({
    pageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
    pageName: connection.pageName,
  });
  channelResults.push(
    channelResult({
      channel: "facebook_message",
      threadsFound: facebookMessages.threads.length,
      messagesFound: facebookMessages.messages.length,
      error: facebookMessages.error,
    }),
  );
  if (facebookMessages.error) {
    errors.push(`Facebook messages: ${facebookMessages.error}`);
  } else {
    allThreads.push(...facebookMessages.threads);
    allMessages.push(...facebookMessages.messages);
  }

  const instagramDms = await fetchInstagramDirectMessages({
    pageId: connection.facebookPageId,
    instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
    grantedScopes,
  });
  channelResults.push(
    channelResult({
      channel: "instagram_dm",
      threadsFound: instagramDms.threads.length,
      messagesFound: instagramDms.messages.length,
      error: instagramDms.error,
      warning: instagramDms.warning,
    }),
  );
  if (instagramDms.error) {
    errors.push(`Instagram DMs: ${instagramDms.error}`);
  } else {
    allThreads.push(...instagramDms.threads);
    allMessages.push(...instagramDms.messages);
  }
  if (instagramDms.warning) {
    warnings.push(`Instagram DMs: ${instagramDms.warning}`);
  }

  const instagramComments = await fetchInstagramMediaComments({
    instagramAccountId,
    pageAccessToken: connection.pageAccessToken,
    grantedScopes,
  });
  channelResults.push(
    channelResult({
      channel: "instagram_comment",
      threadsFound: instagramComments.threads.length,
      messagesFound: instagramComments.messages.length,
      error: instagramComments.error,
      warning: instagramComments.warning,
    }),
  );
  if (instagramComments.error) {
    errors.push(`Instagram comments: ${instagramComments.error}`);
  } else {
    allThreads.push(...instagramComments.threads);
    allMessages.push(...instagramComments.messages);
  }
  if (instagramComments.warning) {
    warnings.push(`Instagram comments: ${instagramComments.warning}`);
  }

  const facebookComments = await fetchFacebookPostComments({
    pageId: connection.facebookPageId,
    pageAccessToken: connection.pageAccessToken,
    grantedScopes,
  });
  channelResults.push(
    channelResult({
      channel: "facebook_comment",
      threadsFound: facebookComments.threads.length,
      messagesFound: facebookComments.messages.length,
      error: facebookComments.error,
      warning: facebookComments.warning,
    }),
  );
  if (facebookComments.error) {
    errors.push(`Facebook comments: ${facebookComments.error}`);
  } else {
    allThreads.push(...facebookComments.threads);
    allMessages.push(...facebookComments.messages);
  }
  if (facebookComments.warning) {
    warnings.push(`Facebook comments: ${facebookComments.warning}`);
  }

  const upserted = await upsertInboxBatch({
    organizationId,
    threads: allThreads,
    messages: allMessages,
  });

  const hasData = upserted.threadsUpserted > 0 || upserted.messagesUpserted > 0;
  const allFailed = channelResults.every((channel) => channel.error && channel.threadsFound === 0);
  const syncIssues = [...errors, ...warnings];
  const syncError =
    allFailed && errors.length > 0
      ? errors.join(" | ")
      : syncIssues.length > 0
        ? syncIssues.join(" | ")
        : null;

  await upsertOrganizationInboxSettings({
    organizationId,
    syncEnabled: hasData || errors.length < channelResults.length,
    lastSyncedAt: new Date().toISOString(),
    lastSyncError: syncError,
  });

  return {
    ok: !allFailed,
    threadsUpserted: upserted.threadsUpserted,
    messagesUpserted: upserted.messagesUpserted,
    channels: channelResults,
    error: allFailed ? errors.join(" | ") : null,
    warnings,
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
