import { MetaConnectionPanel } from "@/components/meta-publishing/MetaConnectionPanel";
import { MetaInboxSettingsPanel } from "@/components/inbox/MetaInboxSettingsPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
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
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Meta Publishing",
};

interface MetaPublishingSettingsPageProps {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    hint?: string;
    scopes?: string;
    pages?: string;
    scope_warning?: string;
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

  const statusMessage =
    params.connected === "1"
      ? params.scope_warning === "missing_engagement"
        ? "Meta connected, but your Page token is still missing pages_manage_engagement for comment replies."
        : "Meta connected successfully."
      : getMetaOAuthErrorMessage(params.error);
  const statusHint = params.error && params.hint ? params.hint : null;
  const scopeWarningHint =
    params.connected === "1" && params.scope_warning === "missing_engagement"
      ? "Add pages_manage_engagement to your Login for Business configuration (campaignstudiopush2), set it to Ready for testing, then click Reconnect with Facebook once more. This is not a routine step — existing tokens never pick up new permissions automatically."
      : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Meta Publishing"
        description={`Connect Facebook and Instagram once for ${organization?.name ?? "your PTO"}. Publishing, inbox DMs, and comments all use the same OAuth connection.`}
        eyebrow="Configure"
      />

      {statusMessage && (
        <div
          className={
            params.connected === "1" ? "text-sm text-emerald-700" : "space-y-2 text-sm text-red-600"
          }
          role="status"
        >
          <p>{statusMessage}</p>
          {scopeWarningHint ? <p className="text-amber-800">{scopeWarningHint}</p> : null}
          {statusHint ? <p className="text-cos-muted">{statusHint}</p> : null}
          {params.error === "no_pages" && params.pages ? (
            <p className="text-cos-muted">
              Facebook granted access to page ID(s):{" "}
              <code className="rounded bg-cos-bg px-1">{params.pages}</code>. Set{" "}
              <code className="rounded bg-cos-bg px-1">META_FACEBOOK_PAGE_ID</code> to one of those
              IDs on your server, then reconnect.
            </p>
          ) : null}
          {params.error === "no_pages" ? (
            <p className="text-cos-muted">
              Next: in Vercel, add <code className="rounded bg-cos-bg px-1">META_FACEBOOK_PAGE_ID</code>{" "}
              with your Page&apos;s numeric ID, redeploy, then click{" "}
              <strong className="font-medium text-cos-text">Reconnect with Facebook</strong>.
            </p>
          ) : null}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isConnected ? "Connected" : "Connect Meta"}</CardTitle>
          <CardDescription>
            One Facebook sign-in covers auto-publishing and Unified Inbox. Approved milestones post
            automatically; DMs and comments sync in the background.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MetaConnectionPanel
            connection={connection}
            configuredViaEnv={configuredViaEnv}
            integrationConfigured={integrationConfigured}
            oauthError={params.error ?? null}
            tokenNeverExpires={inboxConnection.metaTokenNeverExpires}
            reconnectRequired={inboxConnection.metaReconnectRequired}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unified Inbox</CardTitle>
          <CardDescription>
            Webhooks deliver new messages automatically. Use manual sync below only if something
            looks out of date.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MetaInboxSettingsPanel connection={inboxConnection} />
        </div>
      </Card>
    </div>
  );
}
