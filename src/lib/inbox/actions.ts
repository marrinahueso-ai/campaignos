"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { refreshInboxScopesFromPageToken } from "@/lib/inbox/settings";
import { subscribeMetaInboxWebhooks } from "@/lib/inbox/sync/subscribe-webhooks";
import { syncInboxForOrganization } from "@/lib/inbox/sync/sync-organization";
import { getMetaConnectionForCurrentOrg } from "@/lib/meta-publishing/connection";

export type InboxActionResult = {
  success: boolean;
  error?: string | null;
  warning?: string | null;
  threadsUpserted?: number;
  messagesUpserted?: number;
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
    revalidatePath("/inbox");
    return {
      success: false,
      error: `${result.error}${subscribeNote}`,
      warning: result.warnings.length > 0 ? result.warnings.join(" | ") : null,
      threadsUpserted: result.threadsUpserted,
      messagesUpserted: result.messagesUpserted,
    };
  }

  revalidatePath("/inbox");
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

  revalidatePath("/inbox");
  return { success: true };
}
