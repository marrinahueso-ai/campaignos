import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

export type CalendarEventCategory =
  | "PTO Event"
  | "School Event"
  | "Holiday"
  | "Early Release";

export type CalendarEventReviewStatus = "ready" | "needs_review" | "conflict";

export interface CalendarReviewEvent {
  id: string;
  name: string;
  date: string;
  category: CalendarEventCategory;
  status: CalendarEventReviewStatus;
  communicationStrategy: CommunicationStrategy;
  /** Inferred or manually chosen event type — drives playbook timing on import. */
  eventType?: EventType | null;
  /** When true, communication strategy was set manually and should not be auto-updated. */
  planManuallySet?: boolean;
}

export interface CalendarReviewStats {
  totalEventsFound: number;
  ptoEvents: number;
  schoolEvents: number;
  holidays: number;
  earlyReleaseDays: number;
  conflictsFound: number;
}

export interface CalendarReviewData {
  filename: string;
  uploadedAt: string;
  stats: CalendarReviewStats;
  events: CalendarReviewEvent[];
}
