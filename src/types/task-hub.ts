import type { EventPlaybookTask } from "@/types/event-playbooks";

export type TaskHubViewScope = "all_committees" | "chaired_committees";

export interface TaskHubEventContext {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
}

export interface TaskHubTaskItem extends EventPlaybookTask {
  event: TaskHubEventContext;
}

export interface TaskHubCommitteeGroup {
  committeeId: string | null;
  committeeName: string;
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
