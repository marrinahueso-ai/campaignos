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
import {
  getMondayBoardDetails,
  listMondayBoards,
} from "@/lib/monday/client";
import type { MondayBoardColumn } from "@/lib/monday/types";
import { canManageMondayIntegration } from "@/lib/monday/permissions";
import { backfillOpenTasksToMonday } from "@/lib/monday/sync";
import type { MondayBoardColumnMap } from "@/lib/monday/types";

export type MondayActionResult = {
  success: boolean;
  error?: string | null;
};

async function requireMondayManager(): Promise<
  { ok: true; organizationId: string } | { ok: false; error: string }
> {
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
  const auth = await requireMondayManager();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const ok = await disconnectMondayConnection(auth.organizationId);
  if (!ok) {
    return { success: false, error: "Could not disconnect Monday." };
  }

  revalidatePath("/settings/monday");
  revalidatePath("/tasks");
  return { success: true };
}

export async function setMondaySyncEnabledAction(enabled: boolean): Promise<MondayActionResult> {
  const auth = await requireMondayManager();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const ok = await setMondaySyncEnabled(auth.organizationId, enabled);
  if (!ok) {
    return { success: false, error: "Could not update Monday sync setting." };
  }

  revalidatePath("/settings/monday");
  revalidatePath("/tasks");
  return { success: true };
}

export async function listMondayBoardsAction(): Promise<{
  success: boolean;
  error?: string | null;
  boards?: { id: string; name: string; workspaceId: string | null }[];
}> {
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

  const boards = await listMondayBoards(connection.accessToken);
  return { success: true, boards };
}

export async function getMondayBoardColumnsAction(boardId: string): Promise<{
  success: boolean;
  error?: string | null;
  boardName?: string;
  columns?: MondayBoardColumn[];
}> {
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

  return {
    success: true,
    boardName: board.name,
    columns: board.columns,
  };
}

export async function saveMondayBoardMappingAction(input: {
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  columnMap: MondayBoardColumnMap;
}): Promise<MondayActionResult> {
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

  revalidatePath("/settings/monday");
  revalidatePath("/tasks");
  return { success: true };
}

export async function getMondayBoardMappingAction(): Promise<{
  success: boolean;
  mapping: {
    mondayBoardId: string;
    mondayWorkspaceId: string | null;
    columnMap: MondayBoardColumnMap;
  } | null;
}> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { success: false, mapping: null };
  }

  const mapping = await getMondayBoardMappingForOrganization(organization.id);
  if (!mapping) {
    return { success: true, mapping: null };
  }

  return {
    success: true,
    mapping: {
      mondayBoardId: mapping.mondayBoardId,
      mondayWorkspaceId: mapping.mondayWorkspaceId,
      columnMap: mapping.columnMap,
    },
  };
}

export async function backfillMondayTasksAction(): Promise<
  MondayActionResult & { created?: number; skipped?: number; failed?: number }
> {
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

  revalidatePath("/tasks");
  revalidatePath("/settings/monday");

  return {
    success: true,
    created: result.created,
    skipped: result.skipped,
    failed: result.failed,
  };
}
