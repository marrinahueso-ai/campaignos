import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { EventType } from "@/types/playbooks";

export type CalendarEventCategory =
  | "PTO Event"
  | "School Event"
  | "Holiday"
  | "Early Release";

export type CalendarImportSource =
  | "ics"
  | "google"
  | "subscribe"
  | "ai_parse"
  | "manual";

export type CalendarEventReviewStatus =
  | "ready"
  | "needs_review"
  | "conflict"
  | "duplicate"
  | "update";

export interface CalendarReviewEvent {
  id: string;
  name: string;
  date: string;
  category: CalendarEventCategory;
  status: CalendarEventReviewStatus;
  communicationStrategy: CommunicationStrategy;
  /**
   * Org playbook chosen on Calendar Review (Settings → Playbooks).
   * Passed to `assignPlaybookToEvent` on import when strategy needs a playbook.
   */
  playbookId?: string | null;
  /** Inferred or manually chosen event type — drives playbook timing on import. */
  eventType?: EventType | null;
  /** When true, communication strategy was set manually and should not be auto-updated. */
  planManuallySet?: boolean;
  importSource?: CalendarImportSource | null;
  /** ICS UID, Google event id, or AI content fingerprint. */
  importExternalId?: string | null;
  /** Matched existing event for duplicate / update rows. */
  existingEventId?: string | null;
  /** Human-readable why this row is New / Duplicate / Update / Conflict. */
  matchReason?: string | null;
  /**
   * When status is `update`: true = apply title/date patch on import (default).
   * Interactive review can set false to Skip.
   */
  applyUpdate?: boolean;
}

export interface CalendarReviewStats {
  totalEventsFound: number;
  ptoEvents: number;
  schoolEvents: number;
  holidays: number;
  earlyReleaseDays: number;
  conflictsFound: number;
  duplicatesFound: number;
  updatesFound: number;
}

export interface CalendarReviewData {
  filename: string;
  uploadedAt: string;
  stats: CalendarReviewStats;
  events: CalendarReviewEvent[];
}
