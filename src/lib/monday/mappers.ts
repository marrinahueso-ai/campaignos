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

export function mapMondayConnectionRow(row: MondayConnectionRow): MondayConnection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    accessToken: row.access_token,
    accountId: row.account_id,
    accountSlug: row.account_slug,
    scopes: row.scopes,
    mondaySyncEnabled: row.monday_sync_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMondayBoardMappingRow(row: MondayBoardMappingRow): MondayBoardMapping {
  return {
    id: row.id,
    organizationId: row.organization_id,
    mondayBoardId: String(row.monday_board_id ?? "").trim(),
    mondayWorkspaceId: row.monday_workspace_id
      ? String(row.monday_workspace_id).trim()
      : null,
    committeeId: null,
    columnMap: normalizeColumnMap(row.column_map),
    committeeGroups: row.committee_groups ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
