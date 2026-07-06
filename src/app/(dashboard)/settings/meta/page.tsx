import { MetaConnectionPanel } from "@/components/meta-publishing/MetaConnectionPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  getMetaConnectionForCurrentOrg,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection";
import { getMetaOAuthErrorMessage } from "@/lib/meta-publishing/connection-utils";
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { META_INBOX_OAUTH_SCOPE_LIST } from "@/lib/meta-publishing/oauth-scopes";
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
  }>;
}

export default async function MetaPublishingSettingsPage({
  searchParams,
}: MetaPublishingSettingsPageProps) {
  const organization = await getLatestOrganization();
  const connection = await getMetaConnectionForCurrentOrg();
  const params = await searchParams;
  const configuredViaEnv = connection?.id === "env";
  const isConnected = isMetaConnectionConfigured(connection);
  const integrationConfigured = isMetaIntegrationConfigured();

  const statusMessage =
    params.connected === "1"
      ? "Meta connected successfully."
      : getMetaOAuthErrorMessage(params.error);
  const statusHint = params.error && params.hint ? params.hint : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Meta Publishing"
        description={`Connect Facebook and Instagram once for ${organization?.name ?? "your PTO"}. Approved milestones auto-post to the feed and/or story surfaces you choose on each milestone.`}
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
            After approval, CampaignOS publishes to the Meta surfaces you configure per milestone
            (feed, story, or both) — no manual posting required. Unified Inbox (DMs and comments)
            reuses this connection and requires additional Meta App Review permissions in Phase 2.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MetaConnectionPanel
            connection={connection}
            configuredViaEnv={configuredViaEnv}
            integrationConfigured={integrationConfigured}
            oauthError={params.error ?? null}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unified Inbox (coming soon)</CardTitle>
          <CardDescription>
            DMs and comments will sync to the Inbox after Meta App Review approves messaging
            permissions. Connect your Page above first — inbox sync builds on the same OAuth
            connection.
          </CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6 text-sm text-cos-muted">
          <p>
            Phase 2 will request these additional scopes and submit your Meta app for{" "}
            <a
              href="https://developers.facebook.com/docs/app-review"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cos-accent hover:text-cos-muted"
            >
              App Review
            </a>
            :
          </p>
          <p>
            {META_INBOX_OAUTH_SCOPE_LIST.map((scope) => (
              <code key={scope} className="mr-1 rounded bg-cos-bg px-1">
                {scope}
              </code>
            ))}
          </p>
          <p>
            Manage inbox connection status from{" "}
            <a href="/inbox" className="font-medium text-cos-accent hover:text-cos-muted">
              Inbox
            </a>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
