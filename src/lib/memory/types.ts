import type { CampaignIntelligence } from "@/lib/campaign-intelligence";
import type { Event } from "@/types";
import type { ActivityLogEntry, EventWorkspaceData } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";

/** Institutional memory for a single event — the scrapbook, not the audit log. */
export interface EventMemory {
  eventId: string;
  schoolYear: string | null;
  eventTitle: string;
  campaignSummary: CampaignMemorySummary;
  communicationsCreated: CommunicationMemoryItem[];
  artworkUsed: ArtworkMemoryItem[];
  filesUploaded: FileMemoryItem[];
  volunteersInvolved: VolunteerMemoryItem[];
  approvalsCompleted: ApprovalMemoryItem[];
  publishingHistory: PublishingMemoryEntry[];
  photos: PhotoMemoryItem[];
  sponsors: SponsorMemoryItem[];
  notes: string | null;
  lessonsLearned: LessonsLearnedState;
  campaignCompletion: CampaignCompletionMemory | null;
  createdBy: string | null;
  completedDate: string | null;
  timeline: MemoryTimelineEntry[];
  reusePreview: ReusePreview;
}

export interface CampaignMemorySummary {
  headline: string;
  introLine: string;
  channelHighlights: string[];
  artworkLine: string | null;
  closingLine: string | null;
  /** Plain prose for AI context later */
  narrative: string;
}

export interface CommunicationMemoryItem {
  id: string;
  channelLabel: string;
  statusLabel: string;
  isPublished: boolean;
  lastUpdated: string;
}

export interface ArtworkMemoryItem {
  id: string;
  label: string;
  filename: string | null;
  statusLabel: string;
}

export interface FileMemoryItem {
  id: string;
  label: string;
  filename: string | null;
}

export interface VolunteerMemoryItem {
  label: string;
  detail: string | null;
}

export interface ApprovalMemoryItem {
  id: string;
  label: string;
  statusLabel: string;
  resolvedAt: string | null;
}

export interface PublishingMemoryEntry {
  id: string;
  label: string;
  scheduledFor: string;
  statusLabel: string;
}

export interface PhotoMemoryItem {
  id: string;
  label: string;
  filename: string | null;
}

/** Reserved for future sponsor tracking */
export interface SponsorMemoryItem {
  name: string;
  detail: string | null;
}

export interface LessonsLearnedState {
  hasContent: boolean;
  items: string[];
  placeholderMessage: string;
}

export interface CampaignCompletionMemory {
  percent: number;
  label: string;
  finishedOnSchedule: boolean;
}

export interface MemoryTimelineEntry {
  id: string;
  title: string;
  description: string | null;
  occurredAt: string;
  tone: "complete" | "neutral" | "milestone";
}

export interface ReusePreviewItem {
  id: string;
  label: string;
  available: boolean;
  detail: string | null;
}

export interface ReusePreview {
  items: ReusePreviewItem[];
  hasReusableContent: boolean;
}

/** Cross-year context for the same event name — powers Today hints and future AI. */
export interface EventHistoryContext {
  eventId: string;
  priorRunCount: number;
  totalRunCount: number;
  hasPriorArtwork: boolean;
  lastRunDate: string | null;
  lastRunEventId: string | null;
  priorEventIds: string[];
}

export interface BuildEventMemoryInput {
  event: Event;
  schoolYear: string | null;
  workspace: EventWorkspaceData;
  campaignIntelligence?: CampaignIntelligence | null;
  playbookSteps?: EventCommunicationStep[];
  timeline?: ActivityLogEntry[];
}

/** Input bundle for AI comparison prompts (future Insight Engine). */
export interface EventMemoryComparisonContext {
  current: EventMemory;
  priorRuns: EventMemory[];
  history: EventHistoryContext;
}
