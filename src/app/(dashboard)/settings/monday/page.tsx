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
import type { MondayBoardMapping, MondayConnection } from "@/lib/monday/types";

export const metadata = {
  title: "Monday",
};

export const maxDuration = 60;

interface MondaySettingsPageProps {
  searchParams: Promise<{
    connected?: string | string[];
    error?: string | string[];
    error_description?: string | string[];
  }>;
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isMondayBoardConfigured(mapping: MondayBoardMapping | null): boolean {
  if (!mapping) {
    return false;
  }

  return Boolean(
    String(mapping.mondayBoardId ?? "").trim() &&
      String(mapping.columnMap?.statusColumnId ?? "").trim(),
  );
}

async function loadMondaySettingsState(organizationId: string | null): Promise<{
  connection: MondayConnection | null;
  mapping: MondayBoardMapping | null;
  pageLoadError: string | null;
}> {
  try {
    const connection = await getMondayConnectionForCurrentOrg();
    const mapping = organizationId
      ? await getMondayBoardMappingForOrganization(organizationId)
      : null;

    return { connection, mapping, pageLoadError: null };
  } catch (error) {
    console.error("Monday settings page load failed:", error);
    return {
      connection: null,
      mapping: null,
      pageLoadError: "Some Monday settings could not be loaded. You can still disconnect below.",
    };
  }
}

export default async function MondaySettingsPage({ searchParams }: MondaySettingsPageProps) {
  const organization = await getLatestOrganization();
  const { connection, mapping, pageLoadError } = await loadMondaySettingsState(
    organization?.id ?? null,
  );
  const params = await searchParams;
  const connectedParam = firstSearchParam(params.connected);
  const errorParam = firstSearchParam(params.error);
  const errorDescriptionParam = firstSearchParam(params.error_description);
  const integrationConfigured = isMondayIntegrationConfigured();
  const connected = isMondayConnectionConfigured(connection);
  const syncEnabled = Boolean(connection?.mondaySyncEnabled);
  const boardConfigured = isMondayBoardConfigured(mapping);

  const oauthCallbackUrl = getMondayOAuthCallbackUrl(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      "http://localhost:3000",
  );

  const statusMessage =
    connectedParam === "1"
      ? "Monday connected successfully."
      : errorParam
        ? formatMondayOAuthError(errorParam, errorDescriptionParam)
        : null;

  const savedMapping =
    mapping && String(mapping.mondayBoardId ?? "").trim()
      ? {
          mondayBoardId: mapping.mondayBoardId,
          mondayWorkspaceId: mapping.mondayWorkspaceId,
          columnMap: mapping.columnMap,
        }
      : null;

  return (
    <div className="studio-page mx-auto max-w-2xl space-y-10 pb-12">
      <StudioPageHeader
        backHref="/settings"
        title="Monday"
        description={`Sync playbook tasks with Monday.com for ${organization?.name ?? "your PTO"}. One master board with groups per committee.`}
        eyebrow="Configure"
      />

      {pageLoadError && (
        <p className="text-sm text-amber-800" role="status">
          {pageLoadError}
        </p>
      )}

      {statusMessage && (
        <p
          className={
            connectedParam === "1"
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
            justConnected={connectedParam === "1"}
            savedMapping={savedMapping}
          />
        </div>
      </Card>
    </div>
  );
}
