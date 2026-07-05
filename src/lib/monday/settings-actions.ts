"use server";

import { getLatestOrganization } from "@/lib/organizations/queries";
import { isMondayIntegrationConfigured } from "@/lib/monday/config";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForCurrentOrg,
  isMondayConnectionConfigured,
} from "@/lib/monday/connection";
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
  return JSON.parse(JSON.stringify(value)) as T;
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

/** Client-only Monday settings loader — never run during SSR page render. */
export async function getMondaySettingsPageStateAction(): Promise<MondaySettingsPageState> {
  const integrationConfigured = isMondayIntegrationConfigured();

  try {
    const organization = await getLatestOrganization();
    const connection = await getMondayConnectionForCurrentOrg();
    const mapping = organization
      ? await getMondayBoardMappingForOrganization(organization.id)
      : null;

    const connected = isMondayConnectionConfigured(connection);
    const syncEnabled = Boolean(connection?.mondaySyncEnabled);
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
      connected,
      syncEnabled,
      boardConfigured: isBoardConfigured(savedMapping),
      accountSlug: connection?.accountSlug ?? null,
      savedMapping,
      pageLoadError: null,
    });
  } catch (error) {
    console.error("getMondaySettingsPageStateAction failed:", error);
    return sanitizeForClient({
      success: false,
      error: "Some Monday settings could not be loaded. You can still disconnect below.",
      integrationConfigured,
      connected: false,
      syncEnabled: false,
      boardConfigured: false,
      accountSlug: null,
      savedMapping: null,
      pageLoadError:
        "Some Monday settings could not be loaded. You can still disconnect below.",
    });
  }
}
