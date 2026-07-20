import type { EventPlaybookTaskStatus } from "@/types/event-playbooks";
import type { TaskHubPageData, TaskHubTaskItem } from "@/types/task-hub";

export type TasksV2ViewTab =
  | "main_table"
  | "my_tasks"
  | "kanban"
  | "files";

export type TasksV2Priority = "high" | "medium" | "low";

export type TasksV2DisplayStatus = EventPlaybookTaskStatus | "deferred";

export interface TasksV2Viewer {
  /** auth.users id — primary My Tasks match key */
  userId: string | null;
  displayName: string | null;
  email: string | null;
}

export interface TasksV2SummaryStats {
  tasksDue: number;
  overdue: number;
  completedThisMonth: number;
}

export interface TasksV2EventGroup {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventHref: string;
  accentColor: string;
  tasks: TaskHubTaskItem[];
  doneCount: number;
  totalCount: number;
}

export interface TasksV2PageData extends TaskHubPageData {
  eventGroups: TasksV2EventGroup[];
  summary: TasksV2SummaryStats;
  aiAvailable: boolean;
  aiUnavailableReason: string | null;
  viewer: TasksV2Viewer;
}

export interface TasksV2AiInsight {
  id: string;
  text: string;
}
