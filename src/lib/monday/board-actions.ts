"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getLatestOrganization } from "@/lib/organizations/queries";
import {
  createMondayItem,
  createMondaySubitem,
  updateMondayItem,
} from "@/lib/monday/client";
import {
  buildMondayDateColumnValue,
  buildMondayStatusColumnValue,
  buildMondayTimelineColumnValue,
} from "@/lib/monday/column-parsers";
import {
  getMondayBoardMappingForOrganization,
  getMondayConnectionForOrganization,
} from "@/lib/monday/connection";
import { canManageMondayIntegration } from "@/lib/monday/permissions";
import type { MondayBoardColumnMap } from "@/lib/monday/types";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { canEditTaskHub, resolveTaskHubViewScope } from "@/lib/task-hub/access";
import { resolveSiteUrlFromHeaders } from "@/lib/site/url";

export type MondayBoardActionResult = {
  success: boolean;
  error?: string | null;
  itemId?: string;
};

async function requireMondayWriteAccess(): Promise<
  | {
      ok: true;
      organizationId: string;
      accessToken: string;
      boardId: string;
      columnMap: MondayBoardColumnMap;
      subitemsBoardId: string | null;
    }
  | { ok: false; error: string }
> {
  const role = await getCurrentCampaignRole();
  const scope = resolveTaskHubViewScope(role);
  if (!canEditTaskHub(scope)) {
    return { ok: false, error: "You do not have permission to edit tasks." };
  }

  const organization = await getLatestOrganization();
  if (!organization) {
    return { ok: false, error: "Organization not found." };
  }

  const connection = await getMondayConnectionForOrganization(organization.id);
  if (!connection?.accessToken || !connection.mondaySyncEnabled) {
    return { ok: false, error: "Monday sync is not enabled." };
  }

  const mapping = await getMondayBoardMappingForOrganization(organization.id);
  if (!mapping?.columnMap.statusColumnId) {
    return { ok: false, error: "Monday board mapping is not configured." };
  }

  return {
    ok: true,
    organizationId: organization.id,
    accessToken: connection.accessToken,
    boardId: mapping.mondayBoardId,
    columnMap: mapping.columnMap,
    subitemsBoardId: null,
  };
}

async function resolveOrigin(): Promise<string> {
  const headerStore = await headers();
  return resolveSiteUrlFromHeaders(
    headerStore.get("x-forwarded-host") ?? headerStore.get("host"),
    headerStore.get("x-forwarded-proto"),
  );
}

export async function updateMondayBoardItemColumnAction(input: {
  itemId: string;
  columnId: string;
  columnType: "status" | "date" | "timeline";
  value: string | { from: string | null; to: string | null };
}): Promise<MondayBoardActionResult> {
  const auth = await requireMondayWriteAccess();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  let columnValue: Record<string, unknown> | null = null;
  if (input.columnType === "status" && typeof input.value === "string") {
    columnValue = buildMondayStatusColumnValue(input.value);
  } else if (input.columnType === "date" && typeof input.value === "string") {
    columnValue = buildMondayDateColumnValue(input.value || null);
  } else if (input.columnType === "timeline" && typeof input.value === "object") {
    columnValue = buildMondayTimelineColumnValue(input.value);
  }

  if (!columnValue) {
    return { success: false, error: "Invalid column value." };
  }

  try {
    const ok = await updateMondayItem({
      accessToken: auth.accessToken,
      boardId: auth.boardId,
      itemId: input.itemId,
      columnValues: { [input.columnId]: columnValue },
    });
    if (!ok) {
      return { success: false, error: "Monday did not accept the update." };
    }
    revalidatePath("/tasks");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Update failed.",
    };
  }
}

export async function createMondayBoardEventAction(input: {
  groupId: string;
  itemName: string;
  eventId?: string | null;
  eventTitle?: string | null;
}): Promise<MondayBoardActionResult> {
  const auth = await requireMondayWriteAccess();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const columnValues: Record<string, unknown> = {};
  if (input.eventId && input.eventTitle && auth.columnMap.eventLinkColumnId) {
    const origin = await resolveOrigin();
    columnValues[auth.columnMap.eventLinkColumnId] = {
      url: `${origin}/events/${input.eventId}?tab=tasks`,
      text: input.eventTitle,
    };
  }

  if (auth.columnMap.statusColumnId) {
    columnValues[auth.columnMap.statusColumnId] = buildMondayStatusColumnValue("Not Started");
  }

  try {
    const itemId = await createMondayItem({
      accessToken: auth.accessToken,
      boardId: auth.boardId,
      groupId: input.groupId,
      itemName: input.itemName,
      columnValues,
    });
    if (!itemId) {
      return { success: false, error: "Could not create Monday item." };
    }
    revalidatePath("/tasks");
    return { success: true, itemId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Create failed.",
    };
  }
}

export async function createMondayBoardSubitemAction(input: {
  parentItemId: string;
  itemName: string;
  statusLabel?: string | null;
}): Promise<MondayBoardActionResult> {
  const auth = await requireMondayWriteAccess();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  const columnValues: Record<string, unknown> = {};
  const statusColumnId =
    auth.columnMap.subitemStatusColumnId ?? auth.columnMap.statusColumnId;
  if (statusColumnId) {
    columnValues[statusColumnId] = buildMondayStatusColumnValue(
      input.statusLabel ?? "Not Started",
    );
  }

  try {
    const itemId = await createMondaySubitem({
      accessToken: auth.accessToken,
      parentItemId: input.parentItemId,
      itemName: input.itemName,
      columnValues: Object.keys(columnValues).length > 0 ? columnValues : undefined,
    });
    if (!itemId) {
      return { success: false, error: "Could not create subitem." };
    }
    revalidatePath("/tasks");
    return { success: true, itemId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Create failed.",
    };
  }
}

export async function canManageMondayBoardAction(): Promise<boolean> {
  const role = await getCurrentCampaignRole();
  return canManageMondayIntegration(role);
}
