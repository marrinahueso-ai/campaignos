import type { CommunicationChannel } from "@/types/event-workspace";

export type EventType =
  | "book_fair"
  | "teacher_appreciation"
  | "pto_meeting"
  | "spirit_night"
  | "fundraiser"
  | "family_event"
  | "volunteer_drive"
  | "early_release"
  | "holiday"
  | "general_event";

export type PlaybookStepDefaultStatus =
  | "upcoming"
  | "pending"
  | "in_progress"
  | "completed"
  | "skipped";

export type EventCommunicationStepStatus = "upcoming" | "completed" | "skipped";

/** Which Meta placements to publish for a facebook/instagram communication step. */
export type MetaPublishSurfaces = "both" | "feed_only" | "story_only";

export interface CommunicationPlaybook {
  id: string;
  organizationId: string | null;
  slug: string;
  name: string;
  description: string | null;
  eventType: EventType;
  isSystem: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  stepCount?: number;
}

export interface CommunicationPlaybookRow {
  id: string;
  organization_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  event_type: EventType;
  is_system: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommunicationPlaybookStep {
  id: string;
  playbookId: string;
  sortOrder: number;
  relativeDay: number;
  title: string;
  channel: CommunicationChannel;
  isRequired: boolean;
  defaultStatus: PlaybookStepDefaultStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationPlaybookStepRow {
  id: string;
  playbook_id: string;
  sort_order: number;
  relative_day: number;
  title: string;
  channel: CommunicationChannel;
  is_required: boolean;
  default_status: PlaybookStepDefaultStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationPlaybookDefault {
  id: string;
  organizationId: string;
  eventType: EventType;
  playbookId: string;
  createdAt: string;
}

export interface OrganizationPlaybookDefaultRow {
  id: string;
  organization_id: string;
  event_type: EventType;
  playbook_id: string;
  created_at: string;
}

export interface EventPlaybookAssignment {
  id: string;
  eventId: string;
  playbookId: string;
  assignedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventPlaybookAssignmentRow {
  id: string;
  event_id: string;
  playbook_id: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export interface EventCommunicationStep {
  id: string;
  eventId: string;
  assignmentId: string;
  playbookStepId: string | null;
  sortOrder: number;
  relativeDay: number;
  dueDate: string;
  title: string;
  channel: CommunicationChannel;
  isRequired: boolean;
  status: EventCommunicationStepStatus;
  metaPublishSurfaces: MetaPublishSurfaces;
  /** When true, story is posted manually (Post Kit); feed still auto-publishes if enabled. */
  storyManualPublish: boolean;
  /** When set, story post kit reminder email was sent for this milestone. */
  storyReminderSentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventCommunicationStepRow {
  id: string;
  event_id: string;
  assignment_id: string;
  playbook_step_id: string | null;
  sort_order: number;
  relative_day: number;
  due_date: string;
  title: string;
  channel: CommunicationChannel;
  is_required: boolean;
  status: EventCommunicationStepStatus;
  meta_publish_surfaces: MetaPublishSurfaces;
  story_manual_publish: boolean;
  story_reminder_sent_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventPlaybookData {
  assignment: EventPlaybookAssignment;
  playbook: CommunicationPlaybook;
  steps: EventCommunicationStep[];
  healthPercent: number;
}

export interface PlaybookEditorInput {
  name: string;
  description: string | null;
  eventType: EventType;
}

export interface PlaybookStepInput {
  relativeDay: number;
  title: string;
  channel: CommunicationChannel;
  isRequired: boolean;
  defaultStatus: PlaybookStepDefaultStatus;
  metaPublishSurfaces?: MetaPublishSurfaces;
  /** Optional calendar date override (YYYY-MM-DD) from milestone planning. */
  dueDate?: string;
  /** Optional local schedule time (HH:mm) paired with dueDate for meta slots. */
  scheduleTime?: string;
}

export interface CommunicationHealthSummary {
  totalRequired: number;
  completedRequired: number;
  healthPercent: number;
}
