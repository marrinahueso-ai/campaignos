import {
  CanvaConnectionPanel,
} from "@/components/canva/CanvaConnectionPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { isCanvaIntegrationConfigured } from "@/lib/canva/config";
import {
  getCanvaConnectionForCurrentOrg,
  isCanvaConnectionConfigured,
} from "@/lib/canva/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Canva",
};

interface CanvaSettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string }>;
}

export default async function CanvaSettingsPage({ searchParams }: CanvaSettingsPageProps) {
  const organization = await getLatestOrganization();
  const connection = await getCanvaConnectionForCurrentOrg();
  const params = await searchParams;
  const integrationConfigured = isCanvaIntegrationConfigured();
  const connected = isCanvaConnectionConfigured(connection);

  const statusMessage =
    params.connected === "1"
      ? "Canva connected successfully."
      : params.error
        ? `Could not connect Canva (${params.error.replaceAll("_", " ")}).`
        : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Canva"
        description={`Connect Canva once for ${organization?.name ?? "your PTO"}. Volunteers can import designs directly into campaign artwork — no download-and-upload step.`}
        eyebrow="Configure"
      />

      {statusMessage && (
        <p
          className={
            params.connected === "1"
              ? "text-sm text-emerald-700"
              : "text-sm text-red-600"
          }
          role="status"
        >
          {statusMessage}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{connected ? "Connected" : "Connect Canva"}</CardTitle>
          <CardDescription>
            Uses Canva Connect to list your designs and export PNGs into CampaignOS artwork
            milestones.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <CanvaConnectionPanel
            connected={connected}
            integrationConfigured={integrationConfigured}
          />
        </div>
      </Card>
    </div>
  );
}
