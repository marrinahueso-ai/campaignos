import {
  MondayBoardMappingPanel,
} from "@/components/monday/MondayBoardMappingPanel";
import { MondayConnectionPanel } from "@/components/monday/MondayConnectionPanel";
import { StudioPageHeader } from "@/components/layout/StudioPageHeader";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  formatMondayOAuthError,
  getMondayOAuthCallbackUrl,
  isMondayIntegrationConfigured,
} from "@/lib/monday/config";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForCurrentOrg,
  isMondayConnectionConfigured,
} from "@/lib/monday/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Monday",
};

export const maxDuration = 60;

interface MondaySettingsPageProps {
  searchParams: Promise<{ connected?: string; error?: string; error_description?: string }>;
}

export default async function MondaySettingsPage({ searchParams }: MondaySettingsPageProps) {
  const organization = await getLatestOrganization();
  const connection = await getMondayConnectionForCurrentOrg();
  const mapping = organization
    ? await getMondayBoardMappingForOrganization(organization.id)
    : null;
  const params = await searchParams;
  const integrationConfigured = isMondayIntegrationConfigured();
  const connected = isMondayConnectionConfigured(connection);
  const syncEnabled = Boolean(connection?.mondaySyncEnabled);
  const boardConfigured = Boolean(
    mapping?.mondayBoardId?.trim() && mapping.columnMap.statusColumnId?.trim(),
  );

  const oauthCallbackUrl = getMondayOAuthCallbackUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000",
  );

  const statusMessage =
    params.connected === "1"
      ? "Monday connected successfully."
      : params.error
        ? formatMondayOAuthError(params.error, params.error_description)
        : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Monday"
        description={`Sync playbook tasks with Monday.com for ${organization?.name ?? "your PTO"}. One master board with groups per committee.`}
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
          <CardTitle>{connected ? "Connected" : "Connect Monday"}</CardTitle>
          <CardDescription>
            OAuth connection for your organization. Enable sync when you are ready to push tasks.
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MondayConnectionPanel
            connected={connected}
            integrationConfigured={integrationConfigured}
            syncEnabled={syncEnabled}
            boardConfigured={boardConfigured}
            accountSlug={connection?.accountSlug ?? null}
            oauthCallbackUrl={oauthCallbackUrl}
          />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Board &amp; columns</CardTitle>
          <CardDescription>
            {mapping?.mondayBoardId
              ? "Update your master board or column mapping."
              : "Pick a master board and map Status, Date, Assignee, Task ID, and Event link columns."}
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <MondayBoardMappingPanel
            connected={connected}
            syncEnabled={syncEnabled}
            justConnected={params.connected === "1"}
            savedMapping={
              mapping
                ? {
                    mondayBoardId: mapping.mondayBoardId,
                    mondayWorkspaceId: mapping.mondayWorkspaceId,
                    columnMap: mapping.columnMap,
                  }
                : null
            }
          />
        </div>
      </Card>
    </div>
  );
}
