import type {
  MondayBoardMappingRow,
  MondayConnectionRow,
  MondayTaskLinkRow,
} from "@/lib/monday/db-types";
import type {
  MondayBoardColumnMap,
  MondayBoardMapping,
  MondayConnection,
  MondayItemLink,
} from "@/lib/monday/types";

function normalizeCommitteeGroups(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const groups: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value == null) {
      continue;
    }
    const coerced = String(value).trim();
    if (coerced) {
      groups[String(key)] = coerced;
    }
  }
  return groups;
}

export function mapMondayConnectionRow(row: MondayConnectionRow): MondayConnection {
  return {
    id: String(row.id ?? ""),
    organizationId: String(row.organization_id ?? ""),
    accessToken: typeof row.access_token === "string" ? row.access_token : "",
    accountId: row.account_id ? String(row.account_id) : null,
    accountSlug: row.account_slug ? String(row.account_slug) : null,
    scopes: row.scopes ? String(row.scopes) : null,
    mondaySyncEnabled: Boolean(row.monday_sync_enabled),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapMondayBoardMappingRow(row: MondayBoardMappingRow): MondayBoardMapping {
  return {
    id: String(row.id ?? ""),
    organizationId: String(row.organization_id ?? ""),
    mondayBoardId: String(row.monday_board_id ?? "").trim(),
    mondayWorkspaceId: row.monday_workspace_id
      ? String(row.monday_workspace_id).trim()
      : null,
    committeeId: null,
    columnMap: normalizeColumnMap(row.column_map),
    committeeGroups: normalizeCommitteeGroups(row.committee_groups),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

/** Never throws — returns null when a row cannot be mapped safely. */
export function safeMapMondayBoardMappingRow(
  row: MondayBoardMappingRow,
): MondayBoardMapping | null {
  try {
    return mapMondayBoardMappingRow(row);
  } catch (error) {
    console.error("Failed to map Monday board mapping row:", error);
    return null;
  }
}

/** Never throws — returns null when a row cannot be mapped safely. */
export function safeMapMondayConnectionRow(
  row: MondayConnectionRow,
): MondayConnection | null {
  try {
    return mapMondayConnectionRow(row);
  } catch (error) {
    console.error("Failed to map Monday connection row:", error);
    return null;
  }
}

export function mapMondayTaskLinkRow(row: MondayTaskLinkRow): MondayItemLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    eventPlaybookTaskId: row.event_playbook_task_id,
    mondayItemId: row.monday_item_id,
    mondayBoardId: row.monday_board_id,
    lastSyncedAt: row.last_synced_at,
    syncVersion: row.sync_version,
  };
}

function readColumnMapField(
  map: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): unknown {
  if (camelKey in map) {
    return map[camelKey];
  }
  if (snakeKey in map) {
    return map[snakeKey];
  }
  return undefined;
}

function coerceRequiredMondayColumnId(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function coerceOptionalMondayColumnId(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }
  const coerced = String(value).trim();
  return coerced || null;
}

/** Tolerates null, partial, snake_case, or numeric JSONB from legacy rows. */
function normalizeColumnMap(raw: MondayBoardColumnMap | null | undefined | unknown): MondayBoardColumnMap {
  const map =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  return {
    statusColumnId: coerceRequiredMondayColumnId(
      readColumnMapField(map, "statusColumnId", "status_column_id"),
    ),
    dueDateColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "dueDateColumnId", "due_date_column_id"),
    ),
    assigneeColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "assigneeColumnId", "assignee_column_id"),
    ),
    eventLinkColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "eventLinkColumnId", "event_link_column_id"),
    ),
    campaignOsTaskIdColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "campaignOsTaskIdColumnId", "campaign_os_task_id_column_id"),
    ),
    vpColumnId: coerceOptionalMondayColumnId(readColumnMapField(map, "vpColumnId", "vp_column_id")),
    presidentColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "presidentColumnId", "president_column_id"),
    ),
    committeeColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "committeeColumnId", "committee_column_id"),
    ),
    priorityColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "priorityColumnId", "priority_column_id"),
    ),
    phaseColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "phaseColumnId", "phase_column_id"),
    ),
    urgencyColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "urgencyColumnId", "urgency_column_id"),
    ),
    timelineColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "timelineColumnId", "timeline_column_id"),
    ),
    subitemStatusColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "subitemStatusColumnId", "subitem_status_column_id"),
    ),
    subitemOwnerColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "subitemOwnerColumnId", "subitem_owner_column_id"),
    ),
    subitemDateColumnId: coerceOptionalMondayColumnId(
      readColumnMapField(map, "subitemDateColumnId", "subitem_date_column_id"),
    ),
  };
}
