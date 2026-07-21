export type EventPlaybookTaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done";

export type EventPlaybookNoteType = "lesson" | "note";

export interface EventPlaybookTaskGroupRow {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  collapsed: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventPlaybookTaskRow {
  id: string;
  event_id: string;
  title: string;
  status: EventPlaybookTaskStatus;
  due_date: string | null;
  assignee_name: string | null;
  assignee_initials: string | null;
  assignee_user_id: string | null;
  group_id: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface EventPlaybookNoteRow {
  id: string;
  event_id: string;
  content: string;
  note_type: EventPlaybookNoteType;
  author_name: string | null;
  created_at: string;
}

export interface EventPlaybookFileRow {
  id: string;
  event_id: string;
  name: string;
  url: string | null;
  storage_path: string | null;
  uploaded_at: string;
}

export interface EventPlaybookActivityRow {
  id: string;
  event_id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
}

export interface EventPlaybookTaskGroup {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
  collapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventPlaybookTask {
  id: string;
  eventId: string;
  title: string;
  status: EventPlaybookTaskStatus;
  dueDate: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  /** auth.users id — primary key for My Tasks matching */
  assigneeUserId: string | null;
  groupId: string | null;
  /** Freeform task notes (Tasks detail drawer) */
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventPlaybookNote {
  id: string;
  eventId: string;
  content: string;
  noteType: EventPlaybookNoteType;
  authorName: string | null;
  createdAt: string;
}

export interface EventPlaybookFile {
  id: string;
  eventId: string;
  name: string;
  url: string | null;
  storagePath: string | null;
  uploadedAt: string;
}

export interface EventPlaybookActivity {
  id: string;
  eventId: string;
  action: string;
  actorName: string | null;
  createdAt: string;
}

export interface EventPlaybookHubData {
  tasks: EventPlaybookTask[];
  taskGroups: EventPlaybookTaskGroup[];
  notes: EventPlaybookNote[];
  files: EventPlaybookFile[];
  activity: EventPlaybookActivity[];
  planningProgressPercent: number;
}

export interface EventPlaybookInsightsResult {
  recommendations: string[];
  checklistItems: string[];
  sourceCounts: {
    currentLessons: number;
    currentNotes: number;
    pastLessons: number;
  };
  usedAi: boolean;
}

export interface EventPlaybookListItem {
  eventId: string;
  title: string;
  date: string;
  location: string | null;
  communicationStrategy: string;
  planningProgressPercent: number;
  taskCount: number;
  doneTaskCount: number;
  chairName: string | null;
}
