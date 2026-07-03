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
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Meta Publishing",
};

interface MetaPublishingSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string; hint?: string }>;
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
        description={`Connect Facebook and Instagram once for ${organization?.name ?? "your PTO"}. Approved milestones auto-post to feed and story on both platforms at the scheduled time.`}
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
          {params.error === "no_pages" ? (
            <p className="text-cos-muted">
              Next: expand <strong className="font-medium text-cos-text">Advanced connect</strong>{" "}
              below and connect with your Facebook Page ID plus a token from Graph API Explorer, or
              set <code className="rounded bg-cos-bg px-1">META_FACEBOOK_PAGE_ID</code> on the server
              and reconnect.
            </p>
          ) : null}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isConnected ? "Connected" : "Connect Meta"}</CardTitle>
          <CardDescription>
            After approval, CampaignOS publishes feed and story posts automatically — no manual
            posting required.
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
    </div>
  );
}
