import type { EventPlaybookTask } from "@/types/event-playbooks";

export type TaskHubViewScope = "all_committees" | "chaired_committees";

export type TaskHubViewMode = "list" | "board" | "calendar";

export type TaskHubSecondaryGroupMode = "none" | "assignee" | "due_date";

export interface TaskHubEventContext {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
}

export interface TaskHubTaskItem extends EventPlaybookTask {
  event: TaskHubEventContext;
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
}
