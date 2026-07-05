import type { EventPlaybookTask } from "@/types/event-playbooks";
import type { MondayTaskOverlay } from "@/lib/monday/types";

export type TaskHubViewScope = "all_committees" | "chaired_committees";

export type TaskHubViewMode = "list" | "board" | "calendar";

export type TaskHubSecondaryGroupMode = "none" | "status" | "assignee" | "due_date";

export interface TaskHubEventContext {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
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
}
