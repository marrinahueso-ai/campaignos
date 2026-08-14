import { SettingsEaseMeta } from "@/components/settings-v2/SettingsEaseMeta";
import { getInboxConnectionStatus } from "@/lib/inbox/queries";
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

  const statusMessage =
    params.connected === "1"
      ? "You're connected. Publishing, inbox, and Insights are ready."
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
