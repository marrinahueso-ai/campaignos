import { getOrganizationUsers } from "@/lib/auth/membership-queries";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import {
  getMetaConnectionForCurrentOrg,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import {
  INBOX_CHANNEL_TYPES,
  INBOX_MESSAGES_FETCH_CAP,
  INBOX_MESSAGES_PER_THREAD_CAP,
  INBOX_THREAD_FETCH_CAP,
  INBOX_UNREAD_BADGE_THREAD_CAP,
} from "@/lib/inbox/constants";
import { mapInboxMessageRow, mapInboxThreadRow } from "@/lib/inbox/mappers";
import { buildInboxOrgMembers } from "@/lib/inbox/org-members";
import { getOrganizationInboxSettings } from "@/lib/inbox/settings";
import {
  hasFacebookCommentReplyScopes,
  isMessagingReady,
  missingFacebookCommentReplyScopes,
} from "@/lib/inbox/scopes";
import { fetchConnectedPageProfilePictures } from "@/lib/inbox/sync/profile-pictures";
import type {
  InboxChannelCounts,
  InboxConnectionStatus,
  InboxMessage,
  InboxPageData,
} from "@/lib/inbox/types";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { InboxMessageRow, InboxThreadRow } from "@/lib/inbox/db-types";
import {
  ensureMetaConnectionHealthyForOrganization,
  type MetaTokenHealthStatus,
} from "@/lib/meta-publishing/connection-token-health";

function emptyChannelCounts(): InboxChannelCounts {
  return {
    all: 0,
    instagram_dm: 0,
    facebook_message: 0,
    instagram_comment: 0,
    facebook_comment: 0,
    instagram_tag: 0,
    facebook_tag: 0,
    tagged: 0,
  };
}

function buildConnectionStatus(
  organizationName: string | null,
  metaConnection: Awaited<ReturnType<typeof getMetaConnectionForCurrentOrg>>,
  inboxSettings: Awaited<ReturnType<typeof getOrganizationInboxSettings>>,
  pagePictureUrl: string | null,
  tokenHealth: MetaTokenHealthStatus | null,
): InboxConnectionStatus {
  const metaConnected = isMetaConnectionConfigured(metaConnection);
  const hasInstagram = isInstagramPublishingConfigured(metaConnection);
  const grantedScopes =
    tokenHealth?.inboxRelevantScopes ?? inboxSettings?.messagingScopesGranted ?? [];
  const missingReplyScopes =
    tokenHealth?.missingFacebookCommentReplyScopes ??
    missingFacebookCommentReplyScopes(grantedScopes);

  return {
    metaConnected,
    metaConfiguredViaEnv: metaConnection?.id === "env",
    integrationConfigured: isMetaIntegrationConfigured(),
    facebookPageId: metaConnection?.facebookPageId ?? null,
    pageName: metaConnection?.pageName ?? null,
    pagePictureUrl,
    hasInstagram,
    messagingReady: isMessagingReady({
      metaConnected,
      grantedScopes,
    }),
    facebookCommentReplyReady:
      metaConnected &&
      (tokenHealth?.facebookCommentReplyReady ?? hasFacebookCommentReplyScopes(grantedScopes)),
    organizationName,
    syncEnabled: inboxSettings?.syncEnabled ?? false,
    lastSyncedAt: inboxSettings?.lastSyncedAt ?? null,
    lastSyncError: inboxSettings?.lastSyncError ?? null,
    grantedScopes,
    missingFacebookCommentReplyScopes: missingReplyScopes,
    metaTokenValid: tokenHealth?.tokenValid ?? metaConnected,
    metaTokenNeverExpires: tokenHealth?.tokenNeverExpires ?? metaConnected,
    metaReconnectRequired: tokenHealth?.reconnectRequired ?? false,
  };
}

async function getInboxChannelCounts(organizationId: string): Promise<InboxChannelCounts> {
  const supabase = await createClient();
  const counts = emptyChannelCounts();

  const [allResult, ...channelResults] = await Promise.all([
    supabase
      .from("inbox_threads")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    ...INBOX_CHANNEL_TYPES.map((channelType) =>
      supabase
        .from("inbox_threads")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("channel_type", channelType),
    ),
  ]);

  if (allResult.error) {
    return emptyChannelCounts();
  }

  counts.all = allResult.count ?? 0;
  for (let index = 0; index < INBOX_CHANNEL_TYPES.length; index += 1) {
    const channelType = INBOX_CHANNEL_TYPES[index];
    const result = channelResults[index];
    if (result.error) {
      continue;
    }
    counts[channelType] = result.count ?? 0;
  }
  counts.tagged = counts.instagram_tag + counts.facebook_tag;

  return counts;
}

async function resolveConnectionPagePictureUrl(
  metaConnection: Awaited<ReturnType<typeof getMetaConnectionForCurrentOrg>>,
): Promise<string | null> {
  if (!metaConnection?.pageAccessToken || !metaConnection.facebookPageId) {
    return null;
  }

  const pictures = await fetchConnectedPageProfilePictures({
    pageId: metaConnection.facebookPageId,
    instagramAccountId: metaConnection.instagramAccountId ?? "",
    pageAccessToken: metaConnection.pageAccessToken,
  });

  return pictures.pageAvatarUrl;
}

async function listInboxThreadsForOrganization(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(INBOX_THREAD_FETCH_CAP);

  if (error || !data) {
    return [];
  }

  return (data as InboxThreadRow[]).map(mapInboxThreadRow);
}

async function listMessagesForThreads(
  organizationId: string,
  threadIds: string[],
): Promise<Record<string, InboxMessage[]>> {
  if (threadIds.length === 0) {
    return {};
  }

  const supabase = await createClient();
  // Newest-first so a global fetch cap still keeps recent messages per thread.
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .in("thread_id", threadIds)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(INBOX_MESSAGES_FETCH_CAP);

  if (error || !data) {
    return {};
  }

  const grouped: Record<string, InboxMessage[]> = {};
  for (const row of data as InboxMessageRow[]) {
    const message = mapInboxMessageRow(row);
    if (!grouped[message.threadId]) {
      grouped[message.threadId] = [];
    }
    const bucket = grouped[message.threadId];
    if (bucket.length < INBOX_MESSAGES_PER_THREAD_CAP) {
      bucket.push(message);
    }
  }

  // UI expects chronological order within each thread.
  for (const threadId of Object.keys(grouped)) {
    grouped[threadId].reverse();
  }

  return grouped;
}

export const getInboxUnreadCountForCurrentOrg = cache(
  async function getInboxUnreadCountForCurrentOrg(): Promise<number> {
  const organization = await getLatestOrganization();
  if (!organization?.id) {
    return 0;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_threads")
    .select("unread_count")
    .eq("organization_id", organization.id)
    .gt("unread_count", 0)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(INBOX_UNREAD_BADGE_THREAD_CAP);

  if (error || !data) {
    return 0;
  }

  return data.reduce((total, row) => total + (row.unread_count as number), 0);
  },
);

export async function getInboxConnectionStatus(): Promise<InboxConnectionStatus> {
  const organization = await getLatestOrganization();
  const metaConnection = await getMetaConnectionForCurrentOrg();
  // Settings / explicit connection panels may still want live Graph health.
  const tokenHealth =
    organization?.id && metaConnection?.pageAccessToken && metaConnection.id !== "env"
      ? await ensureMetaConnectionHealthyForOrganization(organization.id)
      : null;
  const inboxSettings = organization?.id
    ? await getOrganizationInboxSettings(organization.id)
    : null;

  return buildConnectionStatus(
    organization?.name ?? null,
    tokenHealth?.connection ?? metaConnection,
    inboxSettings,
    await resolveConnectionPagePictureUrl(tokenHealth?.connection ?? metaConnection),
    tokenHealth,
  );
}

/**
 * Communications Hub initial load — stored inbox data only.
 * Meta Graph health + page pictures are loaded after first paint via
 * refreshInboxConnectionStatusAction so cold TTFB is not blocked on Graph.
 */
export async function getInboxPageData(options?: {
  oauthErrorCode?: string | null;
  connectedJustNow?: boolean;
}): Promise<InboxPageData> {
  const organization = await getLatestOrganization();
  const metaConnection = await getMetaConnectionForCurrentOrg();
  const inboxSettings = organization?.id
    ? await getOrganizationInboxSettings(organization.id)
    : null;

  const connection = buildConnectionStatus(
    organization?.name ?? null,
    metaConnection,
    inboxSettings,
    null,
    null,
  );

  if (!organization?.id) {
    return {
      connection,
      threads: [],
      messagesByThreadId: {},
      channelCounts: emptyChannelCounts(),
      orgMembers: [],
      oauthError: options?.oauthErrorCode
        ? getMetaOAuthErrorMessage(options.oauthErrorCode)
        : null,
      connectedJustNow: options?.connectedJustNow ?? false,
    };
  }

  const [threads, channelCounts, orgUsers] = await Promise.all([
    listInboxThreadsForOrganization(organization.id),
    getInboxChannelCounts(organization.id),
    getOrganizationUsers(organization.id),
  ]);

  const messagesByThreadId = await listMessagesForThreads(
    organization.id,
    threads.map((thread) => thread.id),
  );

  return {
    connection,
    threads,
    messagesByThreadId,
    channelCounts,
    orgMembers: buildInboxOrgMembers(orgUsers),
    oauthError: options?.oauthErrorCode
      ? getMetaOAuthErrorMessage(options.oauthErrorCode)
      : null,
    connectedJustNow: options?.connectedJustNow ?? false,
  };
}

/** Live Meta Graph health + page picture — call after Communications first paint. */
export async function getLiveInboxConnectionStatus(): Promise<InboxConnectionStatus> {
  return getInboxConnectionStatus();
}
