import { MetaConnectionPanel } from "@/components/meta-publishing/MetaConnectionPanel";
import { MetaInboxSettingsPanel } from "@/components/inbox/MetaInboxSettingsPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getInboxConnectionStatus } from "@/lib/inbox/queries";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { safeOAuthReturnTo } from "@/lib/integrations/oauth";
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
  const configuredViaEnv = connection?.id === "env";
  const isConnected = isMetaConnectionConfigured(connection);
  const integrationConfigured = isMetaIntegrationConfigured();

  const inboxNeedsAttention =
    isConnected &&
    (inboxConnection.metaReconnectRequired ||
      (!inboxConnection.messagingReady && !inboxConnection.metaConfiguredViaEnv));

  const statusMessage =
    params.connected === "1"
      ? "You're connected. Publishing, inbox, and Insights are ready."
      : getMetaOAuthErrorMessage(params.error);
  const statusHint = params.error && params.hint ? params.hint : null;

  return (
    <div className="studio-page mx-auto max-w-xl space-y-8 pb-12">
      <StudioPageHeader
        backHref="/settings/integrations"
        title="Facebook & Instagram"
        description={
          isConnected
            ? `Connected for ${organization?.name ?? "your organization"}.`
            : `Connect once for ${organization?.name ?? "your organization"}. Approve the list Facebook shows — that's it.`
        }
        eyebrow="Integrations"
      />

      {statusMessage && (
        <div
          className={
            params.connected === "1"
              ? "text-sm text-emerald-700"
              : "space-y-2 text-sm text-red-600"
          }
          role="status"
        >
          <p>{statusMessage}</p>
          {statusHint ? <p className="text-cos-muted">{statusHint}</p> : null}
          {params.error === "no_pages" && params.pages ? (
            <p className="text-cos-muted">
              Facebook granted access to page ID(s):{" "}
              <code className="rounded bg-cos-bg px-1">{params.pages}</code>. Set{" "}
              <code className="rounded bg-cos-bg px-1">META_FACEBOOK_PAGE_ID</code> to one of those
              IDs on your server, then reconnect.
            </p>
          ) : null}
        </div>
      )}

      <Card>
        <CardHeader>
          {isConnected ? (
            <Badge variant="success">Connected</Badge>
          ) : (
            <CardTitle>Connect</CardTitle>
          )}
          {!isConnected ? (
            <CardDescription>
              One button. Facebook shows what Hey Ralli can do. You approve — publishing, inbox, and
              Insights all use this connection.
            </CardDescription>
          ) : null}
        </CardHeader>
        <div className="px-6 pb-6">
          <MetaConnectionPanel
            connection={connection}
            configuredViaEnv={configuredViaEnv}
            integrationConfigured={integrationConfigured}
            returnTo={safeOAuthReturnTo(params.returnTo, "/settings/meta")}
            oauthError={params.error ?? null}
            reconnectRequired={inboxConnection.metaReconnectRequired}
          />
        </div>
      </Card>

      {isConnected ? (
        <details
          className="rounded-xl border border-cos-border bg-cos-card px-5 py-4"
          open={inboxNeedsAttention}
        >
          <summary className="cursor-pointer text-sm font-medium text-cos-text">
            {inboxNeedsAttention
              ? "Inbox needs a quick fix"
              : "Something not working? Troubleshoot"}
          </summary>
          <div className="mt-4 border-t border-cos-border pt-4">
            <MetaInboxSettingsPanel connection={inboxConnection} compact />
          </div>
        </details>
      ) : null}
    </div>
  );
}
