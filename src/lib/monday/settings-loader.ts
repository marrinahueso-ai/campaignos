import "server-only";

import { isMondayIntegrationConfigured } from "@/lib/monday/config";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForCurrentOrg,
  isMondayConnectionConfigured,
} from "@/lib/monday/connection";
import { getLatestOrganization } from "@/lib/organizations/queries";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

export type MondaySettingsPageState = {
  success: boolean;
  error?: string | null;
  integrationConfigured: boolean;
  connected: boolean;
  syncEnabled: boolean;
  boardConfigured: boolean;
  accountSlug: string | null;
  savedMapping: {
    mondayBoardId: string;
    mondayWorkspaceId: string | null;
    columnMap: MondayBoardColumnMap;
  } | null;
  pageLoadError: string | null;
};

function sanitizeForClient<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch (error) {
    console.error("Monday settings sanitizeForClient failed:", error);
    return value;
  }
}

function isBoardConfigured(mapping: {
  mondayBoardId: string;
  columnMap: MondayBoardColumnMap;
} | null): boolean {
  if (!mapping) {
    return false;
  }

  return Boolean(
    String(mapping.mondayBoardId ?? "").trim() &&
      String(mapping.columnMap?.statusColumnId ?? "").trim(),
  );
}

function disconnectedState(
  integrationConfigured: boolean,
  pageLoadError: string | null = null,
): MondaySettingsPageState {
  return {
    success: true,
    integrationConfigured,
    connected: false,
    syncEnabled: false,
    boardConfigured: false,
    accountSlug: null,
    savedMapping: null,
    pageLoadError,
  };
}

/** Loads Monday settings from Supabase only — no Monday.com API calls. */
export async function loadMondaySettingsPageState(): Promise<MondaySettingsPageState> {
  const integrationConfigured = isMondayIntegrationConfigured();

  let organizationId: string | null = null;
  try {
    const organization = await getLatestOrganization();
    organizationId = organization?.id ?? null;
  } catch (error) {
    console.error(
      "Monday settings organization lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return sanitizeForClient(
      disconnectedState(
        integrationConfigured,
        "Could not load your organization. Refresh the page or sign in again.",
      ),
    );
  }

  if (!organizationId) {
    console.info("Monday settings: no organization for current user — showing Connect UI.");
    return sanitizeForClient(disconnectedState(integrationConfigured));
  }

  let connection = null;
  try {
    connection = await getMondayConnectionForCurrentOrg();
  } catch (error) {
    console.error(
      "Monday settings connection lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return sanitizeForClient(
      disconnectedState(
        integrationConfigured,
        "Could not read Monday connection status. Refresh the page and try again.",
      ),
    );
  }

  const connected = isMondayConnectionConfigured(connection);
  if (!connected) {
    console.info(
      "Monday settings: no connection for organization — showing Connect UI.",
      { organizationId },
    );
    return sanitizeForClient(disconnectedState(integrationConfigured));
  }

  let mapping = null;
  try {
    mapping = await getMondayBoardMappingForOrganization(organizationId);
  } catch (error) {
    console.error(
      "Monday settings board mapping lookup failed:",
      error instanceof Error ? error.message : error,
    );
    return sanitizeForClient({
      success: true,
      integrationConfigured,
      connected: true,
      syncEnabled: Boolean(connection?.mondaySyncEnabled),
      boardConfigured: false,
      accountSlug: connection?.accountSlug ?? null,
      savedMapping: null,
      pageLoadError:
        "Connected to Monday, but saved board mapping could not be loaded. Pick a board below or disconnect and reconnect.",
    });
  }

  const savedMapping =
    mapping && String(mapping.mondayBoardId ?? "").trim()
      ? {
          mondayBoardId: mapping.mondayBoardId,
          mondayWorkspaceId: mapping.mondayWorkspaceId,
          columnMap: mapping.columnMap,
        }
      : null;

  return sanitizeForClient({
    success: true,
    integrationConfigured,
    connected: true,
    syncEnabled: Boolean(connection?.mondaySyncEnabled),
    boardConfigured: isBoardConfigured(savedMapping),
    accountSlug: connection?.accountSlug ?? null,
    savedMapping,
    pageLoadError: null,
  });
}
