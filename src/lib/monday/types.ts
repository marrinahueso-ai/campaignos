/** Monday.com GraphQL API — domain types used by CampaignOS sync layer. */

export type MondayColumnType =
  | "status"
  | "date"
  | "text"
  | "people"
  | "link"
  | "long_text"
  | "numbers"
  | "timeline"
  | "color"
  | "dropdown";

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
  /** Main item columns (PTO Event Project Planning board). */
  vpColumnId: string | null;
  presidentColumnId: string | null;
  committeeColumnId: string | null;
  priorityColumnId: string | null;
  phaseColumnId: string | null;
  urgencyColumnId: string | null;
  timelineColumnId: string | null;
  /** Subitem board columns. */
  subitemStatusColumnId: string | null;
  subitemOwnerColumnId: string | null;
  subitemDateColumnId: string | null;
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

export interface MondayPersonValue {
  id: string | null;
  name: string;
}

export interface MondayTimelineValue {
  from: string | null;
  to: string | null;
}

export interface MondayRawColumnValue {
  id: string;
  type: string;
  text: string | null;
  value: string | null;
}

/** Parsed column values for a main board item. */
export interface MondayItemColumnValues {
  status: string | null;
  priority: string | null;
  phase: string | null;
  urgency: string | null;
  dueDate: string | null;
  timeline: MondayTimelineValue | null;
  vp: MondayPersonValue[];
  president: MondayPersonValue[];
  committee: string | null;
  committeePeople: MondayPersonValue[];
  raw: Record<string, MondayRawColumnValue>;
}

export interface MondaySubitemColumnValues {
  status: string | null;
  owner: MondayPersonValue[];
  date: string | null;
  raw: Record<string, MondayRawColumnValue>;
}

export interface MondayBoardItem {
  id: string;
  name: string;
  groupId: string;
  columnValues: MondayItemColumnValues;
  subitems: MondayBoardSubitem[];
  eventId: string | null;
  eventHref: string | null;
  mondayItemUrl: string | null;
}

export interface MondayBoardSubitem {
  id: string;
  name: string;
  columnValues: MondaySubitemColumnValues;
  playbookTaskId: string | null;
  mondayItemUrl: string | null;
}

export interface MondayBoardGroupData {
  id: string;
  title: string;
  color: string | null;
  items: MondayBoardItem[];
}

export interface MondayBoardTaskHubData {
  boardId: string;
  boardName: string;
  subitemsBoardId: string | null;
  accountSlug: string | null;
  columns: MondayBoardColumn[];
  columnMap: MondayBoardColumnMap;
  groups: MondayBoardGroupData[];
}
