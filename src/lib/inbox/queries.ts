import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import {
  getMetaConnectionForCurrentOrg,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { mapInboxMessageRow, mapInboxThreadRow } from "@/lib/inbox/mappers";
import { getOrganizationInboxSettings } from "@/lib/inbox/settings";
import { isMessagingReady } from "@/lib/inbox/scopes";
import type {
  InboxChannelCounts,
  InboxConnectionStatus,
  InboxMessage,
  InboxPageData,
} from "@/lib/inbox/types";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { InboxMessageRow, InboxThreadRow } from "@/lib/inbox/db-types";

function emptyChannelCounts(): InboxChannelCounts {
  return {
    all: 0,
    instagram_dm: 0,
    facebook_message: 0,
    instagram_comment: 0,
    facebook_comment: 0,
  };
}

function buildConnectionStatus(
  organizationName: string | null,
  metaConnection: Awaited<ReturnType<typeof getMetaConnectionForCurrentOrg>>,
  inboxSettings: Awaited<ReturnType<typeof getOrganizationInboxSettings>>,
): InboxConnectionStatus {
  const metaConnected = isMetaConnectionConfigured(metaConnection);
  const hasInstagram = isInstagramPublishingConfigured(metaConnection);
  const grantedScopes = inboxSettings?.messagingScopesGranted ?? [];

  return {
    metaConnected,
    metaConfiguredViaEnv: metaConnection?.id === "env",
    integrationConfigured: isMetaIntegrationConfigured(),
    pageName: metaConnection?.pageName ?? null,
    hasInstagram,
    messagingReady: isMessagingReady({
      metaConnected,
      grantedScopes,
    }),
    organizationName,
    syncEnabled: inboxSettings?.syncEnabled ?? false,
    lastSyncedAt: inboxSettings?.lastSyncedAt ?? null,
    lastSyncError: inboxSettings?.lastSyncError ?? null,
    grantedScopes,
  };
}

async function getInboxChannelCounts(organizationId: string): Promise<InboxChannelCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_threads")
    .select("channel_type")
    .eq("organization_id", organizationId);

  if (error || !data) {
    return emptyChannelCounts();
  }

  const counts = emptyChannelCounts();
  for (const row of data as Pick<InboxThreadRow, "channel_type">[]) {
    counts.all += 1;
    counts[row.channel_type] += 1;
  }

  return counts;
}

async function listInboxThreadsForOrganization(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

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
  const { data, error } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("organization_id", organizationId)
    .in("thread_id", threadIds)
    .order("sent_at", { ascending: true, nullsFirst: false });

  if (error || !data) {
    return {};
  }

  const grouped: Record<string, InboxMessage[]> = {};
  for (const row of data as InboxMessageRow[]) {
    const message = mapInboxMessageRow(row);
    if (!grouped[message.threadId]) {
      grouped[message.threadId] = [];
    }
    grouped[message.threadId].push(message);
  }

  return grouped;
}

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
  );

  if (!organization?.id) {
    return {
      connection,
      threads: [],
      messagesByThreadId: {},
      channelCounts: emptyChannelCounts(),
      oauthError: options?.oauthErrorCode
        ? getMetaOAuthErrorMessage(options.oauthErrorCode)
        : null,
      connectedJustNow: options?.connectedJustNow ?? false,
    };
  }

  const [threads, channelCounts] = await Promise.all([
    listInboxThreadsForOrganization(organization.id),
    getInboxChannelCounts(organization.id),
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
    oauthError: options?.oauthErrorCode
      ? getMetaOAuthErrorMessage(options.oauthErrorCode)
      : null,
    connectedJustNow: options?.connectedJustNow ?? false,
  };
}
