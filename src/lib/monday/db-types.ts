import type { MondayBoardColumnMap } from "@/lib/monday/types";

export interface MondayConnectionRow {
  id: string;
  organization_id: string;
  access_token: string;
  account_id: string | null;
  account_slug: string | null;
  scopes: string | null;
  monday_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MondayBoardMappingRow {
  id: string;
  organization_id: string;
  monday_board_id: string;
  monday_workspace_id: string | null;
  column_map: MondayBoardColumnMap;
  committee_groups: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface MondayTaskLinkRow {
  id: string;
  organization_id: string;
  event_playbook_task_id: string;
  monday_item_id: string;
  monday_board_id: string;
  last_synced_at: string | null;
  sync_version: number;
  created_at: string;
  updated_at: string;
}

export interface MondayTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
}
