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
import { isMetaIntegrationConfigured } from "@/lib/meta-publishing/config.server";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Meta Publishing",
};

interface MetaPublishingSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
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
      : params.error
        ? `Could not connect Meta (${params.error.replaceAll("_", " ")}).`
        : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Meta Publishing"
        description={`Connect Facebook and Instagram once for ${organization?.name ?? "your PTO"}. Approved milestones auto-post to feed and story on both platforms at the scheduled time.`}
        eyebrow="Configure"
      />

      {statusMessage && (
        <p
          className={
            params.connected === "1" ? "text-sm text-emerald-700" : "text-sm text-red-600"
          }
          role="status"
        >
          {statusMessage}
        </p>
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
          />
        </div>
      </Card>
    </div>
  );
}
