import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import {
  getMetaConnectionForCurrentOrg,
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { mapInboxThreadRow } from "@/lib/inbox/mappers";
import type {
  InboxChannelCounts,
  InboxConnectionStatus,
  InboxPageData,
} from "@/lib/inbox/types";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { createClient } from "@/lib/supabase/server";
import type { InboxThreadRow } from "@/lib/inbox/db-types";

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
): InboxConnectionStatus {
  const metaConnected = isMetaConnectionConfigured(metaConnection);
  const hasInstagram = isInstagramPublishingConfigured(metaConnection);

  return {
    metaConnected,
    metaConfiguredViaEnv: metaConnection?.id === "env",
    integrationConfigured: isMetaIntegrationConfigured(),
    pageName: metaConnection?.pageName ?? null,
    hasInstagram,
    messagingReady: false,
    organizationName,
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

export async function getInboxPageData(options?: {
  oauthErrorCode?: string | null;
  connectedJustNow?: boolean;
}): Promise<InboxPageData> {
  const organization = await getLatestOrganization();
  const metaConnection = await getMetaConnectionForCurrentOrg();
  const connection = buildConnectionStatus(organization?.name ?? null, metaConnection);

  if (!organization?.id) {
    return {
      connection,
      threads: [],
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

  return {
    connection,
    threads,
    channelCounts,
    oauthError: options?.oauthErrorCode
      ? getMetaOAuthErrorMessage(options.oauthErrorCode)
      : null,
    connectedJustNow: options?.connectedJustNow ?? false,
  };
}
