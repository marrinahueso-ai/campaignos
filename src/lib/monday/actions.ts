"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { getEventPlaybookEvents, getEventPlaybookTasksForEvents } from "@/lib/event-playbooks/queries";
import { getOrganizationWorkspaceData } from "@/lib/organization-workspace/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  disconnectMondayConnection,
  getMondayBoardMappingForOrganization,
  getMondayConnectionForCurrentOrg,
  isMondayConnectionConfigured,
  saveMondayBoardMapping,
  setMondaySyncEnabled,
} from "@/lib/monday/connection";
import { isMondayIntegrationConfigured } from "@/lib/monday/config";
import { isMondayIntegrationEnabled } from "@/lib/monday/feature-flag";
import {
  getMondayBoardDetails,
  listMondayBoardsForSettingsPicker,
  resolveMondayWorkspaceId,
} from "@/lib/monday/client";
import { PTO_TEMPLATE_BOARD_NAME } from "@/lib/monday/constants";
import { createPtoEventProjectPlanningBoard } from "@/lib/monday/template-board";
import type { MondayBoardColumn } from "@/lib/monday/types";
import { canManageMondayIntegration } from "@/lib/monday/permissions";
import { backfillOpenTasksToMonday } from "@/lib/monday/sync";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

export type MondayActionResult = {
  success: boolean;
  error?: string | null;
};

function formatMondayActionError(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Strip non-JSON-serializable values before crossing the server action boundary. */
function sanitizeMondayActionPayload<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function safeRevalidateMondaySettings(): void {
  try {
    revalidatePath("/settings/monday");
    revalidatePath("/tasks");
  } catch (revalidateError) {
    console.warn("Monday settings revalidatePath failed:", revalidateError);
  }
}

async function requireMondayManager(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
  if (!isMondayIntegrationEnabled()) {
    return {
      ok: false,
      error: "Monday integration is temporarily disabled. Use Task Hub without Monday sync.",
    };
  }

  const role = await getCurrentCampaignRole();
  if (!canManageMondayIntegration(role)) {
    return { ok: false, error: "You do not have permission to manage Monday integration." };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  return { ok: true, organizationId: organization.id };
}

export async function getMondayConnectionStatusAction(): Promise<{
  configured: boolean;
  connected: boolean;
  syncEnabled: boolean;
}> {
  const connection = await getMondayConnectionForCurrentOrg();
  return {
    configured: isMondayIntegrationConfigured(),
    connected: isMondayConnectionConfigured(connection),
    syncEnabled: Boolean(connection?.mondaySyncEnabled),
  };
}

export async function disconnectMondayConnectionAction(): Promise<MondayActionResult> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const ok = await disconnectMondayConnection(auth.organizationId);
    if (!ok) {
      return { success: false, error: "Could not disconnect Monday." };
    }

    safeRevalidateMondaySettings();
    return { success: true };
  } catch (error) {
    console.error("disconnectMondayConnectionAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not disconnect Monday."),
    };
  }
}

export async function setMondaySyncEnabledAction(enabled: boolean): Promise<MondayActionResult> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    if (enabled) {
      const mapping = await getMondayBoardMappingForOrganization(auth.organizationId);
      if (!mapping?.mondayBoardId?.trim()) {
        return {
          success: false,
          error: "Select a master board in Step 2 before enabling sync.",
        };
      }
      if (!String(mapping.columnMap?.statusColumnId ?? "").trim()) {
        return {
          success: false,
          error: "Save column mapping (Status column required) before enabling sync.",
        };
      }
    }

    const ok = await setMondaySyncEnabled(auth.organizationId, enabled);
    if (!ok) {
      return { success: false, error: "Could not update Monday sync setting." };
    }

    safeRevalidateMondaySettings();
    return { success: true };
  } catch (error) {
    console.error("setMondaySyncEnabledAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not update Monday sync setting."),
    };
  }
}

export async function listMondayBoardsAction(): Promise<{
  success: boolean;
  error?: string | null;
  boards?: { id: string; name: string; workspaceId: string | null }[];
  workspaceId?: string | null;
  workspaceName?: string | null;
}> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    if (!isMondayIntegrationConfigured()) {
      return { success: false, error: "Monday integration is not configured." };
    }

    const connection = await getMondayConnectionForCurrentOrg();
    if (!isMondayConnectionConfigured(connection)) {
      return { success: false, error: "Connect Monday in Settings first." };
    }

    const { boards, workspaceId, workspaceName } = await listMondayBoardsForSettingsPicker(
      connection.accessToken,
    );

    return sanitizeMondayActionPayload({
      success: true,
      boards,
      workspaceId,
      workspaceName: workspaceName ?? "your Monday account",
    });
  } catch (error) {
    console.error("listMondayBoardsAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not load Monday boards."),
    };
  }
}

export async function createPtoTemplateBoardAction(): Promise<
  MondayActionResult & {
    boardId?: string;
    workspaceId?: string | null;
    columnMap?: MondayBoardColumnMap;
  }
> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    if (!isMondayIntegrationConfigured()) {
      return { success: false, error: "Monday integration is not configured." };
    }

    const connection = await getMondayConnectionForCurrentOrg();
    if (!isMondayConnectionConfigured(connection)) {
      return { success: false, error: "Connect Monday in Settings first." };
    }

    const workspaceId = await resolveMondayWorkspaceId(connection.accessToken);
    if (!workspaceId) {
      return { success: false, error: "No Monday workspace found for this account." };
    }

    const result = await createPtoEventProjectPlanningBoard({
      accessToken: connection.accessToken,
      workspaceId,
    });

    if (!result.ok) {
      return { success: false, error: result.error };
    }

    try {
      safeRevalidateMondaySettings();
    } catch (revalidateError) {
      console.warn("createPtoTemplateBoardAction revalidatePath failed:", revalidateError);
    }

    return sanitizeMondayActionPayload({
      success: true,
      boardId: result.boardId,
      workspaceId: result.workspaceId,
      columnMap: result.columnMap,
    });
  } catch (error) {
    console.error("createPtoTemplateBoardAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not create template board."),
    };
  }
}

export { PTO_TEMPLATE_BOARD_NAME };

export async function getMondayBoardColumnsAction(boardId: string): Promise<{
  success: boolean;
  error?: string | null;
  boardName?: string;
  columns?: MondayBoardColumn[];
}> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const connection = await getMondayConnectionForCurrentOrg();
    if (!isMondayConnectionConfigured(connection)) {
      return { success: false, error: "Connect Monday in Settings first." };
    }

    const board = await getMondayBoardDetails(connection.accessToken, boardId);
    if (!board) {
      return { success: false, error: "Could not load board details." };
    }

    return sanitizeMondayActionPayload({
      success: true,
      boardName: board.name,
      columns: board.columns,
    });
  } catch (error) {
    console.error("getMondayBoardColumnsAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not load board details."),
    };
  }
}

export async function saveMondayBoardMappingAction(input: {
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  columnMap: MondayBoardColumnMap;
}): Promise<MondayActionResult> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    if (!input.columnMap.statusColumnId?.trim()) {
      return { success: false, error: "Status column mapping is required." };
    }

    const ok = await saveMondayBoardMapping({
      organizationId: auth.organizationId,
      mondayBoardId: input.mondayBoardId,
      mondayWorkspaceId: input.mondayWorkspaceId,
      columnMap: input.columnMap,
    });

    if (!ok) {
      return { success: false, error: "Could not save board mapping." };
    }

    safeRevalidateMondaySettings();
    return { success: true };
  } catch (error) {
    console.error("saveMondayBoardMappingAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not save board mapping."),
    };
  }
}

export async function getMondayBoardMappingAction(): Promise<{
  success: boolean;
  error?: string | null;
  mapping: {
    mondayBoardId: string;
    mondayWorkspaceId: string | null;
    columnMap: MondayBoardColumnMap;
  } | null;
}> {
  try {
    const organization = await getLatestOrganization();
    if (!organization) {
      return { success: false, error: "Organization not found.", mapping: null };
    }

    const mapping = await getMondayBoardMappingForOrganization(organization.id);
    if (!mapping) {
      return { success: true, mapping: null };
    }

    return sanitizeMondayActionPayload({
      success: true,
      mapping: {
        mondayBoardId: mapping.mondayBoardId,
        mondayWorkspaceId: mapping.mondayWorkspaceId,
        columnMap: mapping.columnMap,
      },
    });
  } catch (error) {
    console.error("getMondayBoardMappingAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Could not load board mapping."),
      mapping: null,
    };
  }
}

export async function backfillMondayTasksAction(): Promise<
  MondayActionResult & { created?: number; skipped?: number; failed?: number }
> {
  try {
    const auth = await requireMondayManager();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const organization = await getLatestOrganization();
    if (!organization) {
      return { success: false, error: "Organization not found." };
    }

    const workspace = await getOrganizationWorkspaceData(organization.id);
    if (!workspace) {
      return { success: false, error: "Organization workspace not found." };
    }

    const events = await getEventPlaybookEvents(organization.id);
    const eventIds = events.map((event) => event.id);
    const taskRows = await getEventPlaybookTasksForEvents(eventIds);

    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
    const result = await backfillOpenTasksToMonday({
      organizationId: organization.id,
      origin,
      events,
      taskRows,
      workspace,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    safeRevalidateMondaySettings();

    return sanitizeMondayActionPayload({
      success: true,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
    });
  } catch (error) {
    console.error("backfillMondayTasksAction failed:", error);
    return {
      success: false,
      error: formatMondayActionError(error, "Backfill failed."),
    };
  }
}
