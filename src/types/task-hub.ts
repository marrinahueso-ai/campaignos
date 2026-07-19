import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { MondayBoardTaskHubData, MondayTaskOverlay } from "@/lib/monday/types";

export type TaskHubViewScope = "all_committees" | "chaired_committees";

export type TaskHubViewMode = "list" | "board" | "calendar";

export type TaskHubMondayViewMode =
  | "main_table"
  | "event_timeline"
  | "gantt"
  | "calendar"
  | "kanban"
  | "table";

export type TaskHubSecondaryGroupMode = "none" | "status" | "assignee" | "due_date";

export interface TaskHubEventContext {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
}

export interface TaskHubEventOption {
  eventId: string;
  eventTitle: string;
  eventDate: string;
}

export interface TaskHubOrgMember {
  /** organization_users.id */
  id: string;
  /** auth.users id — stored on event_playbook_tasks.assignee_user_id */
  userId: string | null;
  displayName: string;
  initials: string;
  email: string | null;
}

export interface TaskHubTaskItem extends EventPlaybookTask {
  event: TaskHubEventContext;
  /** Read-only overlay from Monday when linked and sync enabled. */
  monday?: MondayTaskOverlay | null;
}

export interface TaskHubSecondaryGroup {
  key: string;
  label: string;
  tasks: TaskHubTaskItem[];
}

export interface TaskHubCommitteeGroup {
  committeeId: string | null;
  committeeName: string;
  chairName: string | null;
  sortOrder: number;
  tasks: TaskHubTaskItem[];
  events: TaskHubEventOption[];
  doneCount: number;
  totalCount: number;
}

export interface TaskHubPageData {
  scope: TaskHubViewScope;
  scopeLabel: string;
  committees: TaskHubCommitteeGroup[];
  tablesAvailable: boolean;
  totalTasks: number;
  openTasks: number;
  mondaySyncEnabled: boolean;
  /** When Monday sync is enabled, primary board data for Task Hub. */
  mondayBoard: MondayBoardTaskHubData | null;
  canEdit: boolean;
  orgMembers: TaskHubOrgMember[];
  events: TaskHubEventOption[];
}
