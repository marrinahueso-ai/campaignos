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
    mondayBoardId: row.monday_board_id,
    mondayWorkspaceId: row.monday_workspace_id,
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

function normalizeColumnMap(raw: MondayBoardColumnMap | null | undefined): MondayBoardColumnMap {
  return {
    statusColumnId: raw?.statusColumnId ?? "",
    dueDateColumnId: raw?.dueDateColumnId ?? null,
    assigneeColumnId: raw?.assigneeColumnId ?? null,
    eventLinkColumnId: raw?.eventLinkColumnId ?? null,
    campaignOsTaskIdColumnId: raw?.campaignOsTaskIdColumnId ?? null,
    vpColumnId: raw?.vpColumnId ?? null,
    presidentColumnId: raw?.presidentColumnId ?? null,
    committeeColumnId: raw?.committeeColumnId ?? null,
    priorityColumnId: raw?.priorityColumnId ?? null,
    phaseColumnId: raw?.phaseColumnId ?? null,
    urgencyColumnId: raw?.urgencyColumnId ?? null,
    timelineColumnId: raw?.timelineColumnId ?? null,
    subitemStatusColumnId: raw?.subitemStatusColumnId ?? null,
    subitemOwnerColumnId: raw?.subitemOwnerColumnId ?? null,
    subitemDateColumnId: raw?.subitemDateColumnId ?? null,
  };
}
