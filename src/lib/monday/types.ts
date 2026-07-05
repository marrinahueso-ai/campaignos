/** Monday.com GraphQL API — domain types used by CampaignOS sync layer. */

export type MondayColumnType =
  | "status"
  | "date"
  | "text"
  | "people"
  | "link"
  | "long_text"
  | "numbers";

export interface MondayBoardColumn {
  id: string;
  title: string;
  type: string;
}

export interface MondayBoardGroup {
  id: string;
  title: string;
}

/** Maps CampaignOS event playbook fields → Monday column roles. */
export interface MondayBoardColumnMap {
  statusColumnId: string;
  dueDateColumnId: string | null;
  assigneeColumnId: string | null;
  eventLinkColumnId: string | null;
  campaignOsTaskIdColumnId: string | null;
}

export interface MondayBoardMapping {
  id: string;
  organizationId: string;
  mondayBoardId: string;
  mondayWorkspaceId: string | null;
  /** null = master board config row. */
  committeeId: string | null;
  columnMap: MondayBoardColumnMap;
  /** Committee id → Monday group id on the master board. */
  committeeGroups: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface MondayItemLink {
  id: string;
  organizationId: string;
  eventPlaybookTaskId: string;
  mondayItemId: string;
  mondayBoardId: string;
  lastSyncedAt: string | null;
  syncVersion: number;
}

export interface MondayConnection {
  id: string;
  organizationId: string;
  accessToken: string;
  accountId: string | null;
  accountSlug: string | null;
  scopes: string | null;
  mondaySyncEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MondayGraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
  account_id?: number;
}

/** Minimal board/item shapes for task hub rendering. */
export interface MondayBoardSummary {
  id: string;
  name: string;
  workspaceId: string | null;
}

export interface MondayItemSummary {
  id: string;
  name: string;
  boardId: string;
  groupId: string | null;
  columnValues: Record<string, unknown>;
}

/** Overlay data merged into task hub rows (read-only from Monday). */
export interface MondayTaskOverlay {
  mondayItemId: string;
  mondayBoardId: string;
  mondayItemUrl: string | null;
  mondayStatusLabel: string | null;
  mondayDueDate: string | null;
  lastSyncedAt: string | null;
}
