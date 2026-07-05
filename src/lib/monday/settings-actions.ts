"use server";

import { listMondayBoardsForSettingsPicker } from "@/lib/monday/client";
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
  boards: { id: string; name: string; workspaceId: string | null }[];
  workspaceId: string | null;
  workspaceName: string | null;
  boardsLoadError: string | null;
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

    let boards: MondaySettingsPageState["boards"] = [];
    let workspaceId: string | null = null;
    let workspaceName: string | null = null;
    let boardsLoadError: string | null = null;

    if (connected && connection?.accessToken) {
      try {
        const picker = await listMondayBoardsForSettingsPicker(connection.accessToken);
        boards = picker.boards;
        workspaceId = picker.workspaceId;
        workspaceName = picker.workspaceName;
      } catch (boardError) {
        console.error("Monday settings board picker failed:", boardError);
        boardsLoadError =
          boardError instanceof Error
            ? boardError.message
            : "Could not load Monday boards.";
      }
    }

    return sanitizeForClient({
      success: true,
      integrationConfigured,
      connected,
      syncEnabled,
      boardConfigured: isBoardConfigured(savedMapping),
      accountSlug: connection?.accountSlug ?? null,
      savedMapping,
      boards,
      workspaceId,
      workspaceName,
      boardsLoadError,
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
      boards: [],
      workspaceId: null,
      workspaceName: null,
      boardsLoadError: null,
      pageLoadError:
        "Some Monday settings could not be loaded. You can still disconnect below.",
    });
  }
}
