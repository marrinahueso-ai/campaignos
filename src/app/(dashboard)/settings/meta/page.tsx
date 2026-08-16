import { SettingsEaseMeta } from "@/components/settings-v2/SettingsEaseMeta";
import { getInboxConnectionStatus } from "@/lib/inbox/queries";
import { fetchInstagramProfessionalProfile } from "@/lib/inbox/sync/profile-pictures";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import {
  getMetaOAuthErrorMessage,
  toMetaSettingsConnectionView,
} from "@/lib/meta-publishing/connection-utils";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Meta",
};

interface MetaPublishingSettingsPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    hint?: string;
    scopes?: string;
    pages?: string;
    scope_warning?: string;
    returnTo?: string;
  }>;
}

export default async function MetaPublishingSettingsPage({
  searchParams,
}: MetaPublishingSettingsPageProps) {
  const organization = await getLatestOrganization();
  const connection = await getMetaConnectionForCurrentOrg();
  const inboxConnection = await getInboxConnectionStatus();
  const params = await searchParams;
  const connectionView = toMetaSettingsConnectionView(connection);
  const isConnected = isMetaConnectionConfigured(connection);
  const integrationConfigured = isMetaIntegrationConfigured();
  const hasInstagram = Boolean(connectionView?.hasInstagram);

  let instagramUsername: string | null = null;
  let instagramPictureUrl: string | null = null;
  if (
    connection &&
    isConnected &&
    hasInstagram &&
    connection.instagramAccountId.trim() &&
    connection.pageAccessToken.trim()
  ) {
    const igProfile = await fetchInstagramProfessionalProfile({
      instagramAccountId: connection.instagramAccountId,
      pageAccessToken: connection.pageAccessToken,
    });
    instagramUsername = igProfile.username;
    instagramPictureUrl = igProfile.profilePictureUrl;
  }

  const statusMessage =
    params.connected === "1"
      ? hasInstagram
        ? "Facebook and Instagram are connected for this organization."
        : "Facebook Page connected. Link Instagram to this Page in Meta, then reconnect if it doesn’t appear."
      : getMetaOAuthErrorMessage(params.error);
  const statusHint = params.error && params.hint ? params.hint : null;
  const statusTone: "success" | "error" | null =
    params.connected === "1" ? "success" : params.error ? "error" : null;

  return (
    <SettingsEaseMeta
      organizationName={organization?.name ?? null}
      connection={connectionView}
      integrationConfigured={integrationConfigured}
      reconnectRequired={
        isConnected && inboxConnection.metaReconnectRequired
      }
      pagePictureUrl={inboxConnection.pagePictureUrl}
      instagramUsername={instagramUsername}
      instagramPictureUrl={instagramPictureUrl}
      messagingReady={inboxConnection.messagingReady}
      returnTo={safeOAuthReturnTo(params.returnTo, "/settings/meta")}
      statusMessage={statusMessage}
      statusHint={statusHint}
      statusTone={statusTone}
      pagesHint={
        params.error === "no_pages" && params.pages ? params.pages : null
      }
    />
  );
}
