import type { CommunicationChannel } from "@/types/event-workspace";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventCommunicationStepStatus } from "@/types/playbooks";

export type CalendarView = "month" | "week" | "list";

export type CalendarMode = "events" | "communications" | "publishing" | "approvals";

export type WorkloadLevel = "calm" | "light" | "busy" | "overloaded";

export interface CalendarEventEntry {
  id: string;
  eventId: string;
  title: string;
  date: string;
  time: string | null;
  status: string;
  communicationStrategy: CommunicationStrategy;
}

export interface CalendarCommunicationEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  stepTitle: string;
  dueDate: string;
  channel: CommunicationChannel;
  status: EventCommunicationStepStatus;
  hasDraft: boolean;
}

export interface CalendarPublishingEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  channel: CommunicationChannel;
  status: string;
  dueDate: string;
  stepTitle: string | null;
  versionNumber: number;
}

export interface CalendarApprovalEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  channel: string;
  dueDate: string;
  status: "pending";
  isPlaceholder: true;
}

export interface CalendarDaySummary {
  date: string;
  eventCount: number;
  communicationCount: number;
  draftCount: number;
  workload: WorkloadLevel;
  workloadTotal: number;
}

export interface CommunicationsCalendarData {
  events: CalendarEventEntry[];
  communications: CalendarCommunicationEntry[];
  publishing: CalendarPublishingEntry[];
  approvals: CalendarApprovalEntry[];
  daySummaries: CalendarDaySummary[];
}

export interface CalendarListItem {
  id: string;
  type: "event" | "communication" | "publishing" | "approval";
  eventId: string;
  eventName: string;
  channel: string | null;
  status: string;
  dueDate: string;
  title: string;
  hasDraft?: boolean;
  isPlaceholder?: boolean;
}

// Engine 6 — Communications Planning Calendar

export type PlanningCalendarView = "month" | "week" | "agenda" | "import-list";

export interface CalendarImportedEventListItem {
  id: string;
  title: string;
  date: string;
  category: string | null;
  communicationStrategy: CommunicationStrategy;
}

export type PlanningItemType =
  | "event"
  | "timeline_task"
  | "draft"
  | "artwork"
  | "approval"
  | "scheduled_post"
  | "meta_milestone";

export interface PlanningCalendarItem {
  id: string;
  sourceId: string;
  sourceType: PlanningItemType;
  eventId: string;
  eventTitle: string;
  title: string;
  timelineStepTitle: string | null;
  timelineStepId: string | null;
  communicationItemId: string | null;
  channel: CommunicationChannel | null;
  communicationType: PlanningItemType;
  scheduledDate: string;
  status: string;
  assignedUser: string | null;
  draftContent: string | null;
  draftStatus: string | null;
  artworkStatus: string | null;
  approvalStatus: string | null;
  publishStatus: string | null;
  versionNumber: number | null;
  communicationStrategy?: CommunicationStrategy | null;
}

export interface PlanningCalendarData {
  items: PlanningCalendarItem[];
  importCleanup?: {
    schoolYearId: string | null;
    schoolYearLabel: string;
    eventCount: number;
  } | null;
  importedEvents: CalendarImportedEventListItem[];
  importListFilename: string | null;
  activeSchoolYearId: string | null;
}

export interface PlanningCalendarFilters {
  eventId: string | null;
  channel: CommunicationChannel | "all";
  status: string | "all";
  assignedUser: string | "all";
  communicationType: PlanningItemType | "all";
}
