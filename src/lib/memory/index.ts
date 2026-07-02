export type {
  ArtworkMemoryItem,
  BuildEventMemoryInput,
  CampaignCompletionMemory,
  CampaignMemorySummary,
  CommunicationMemoryItem,
  EventHistoryContext,
  EventMemory,
  EventMemoryComparisonContext,
  FileMemoryItem,
  LessonsLearnedState,
  MemoryTimelineEntry,
  PhotoMemoryItem,
  PublishingMemoryEntry,
  ReusePreview,
  ReusePreviewItem,
  SponsorMemoryItem,
  VolunteerMemoryItem,
} from "@/lib/memory/types";

export {
  buildEventMemory,
  buildEventHistoryContext,
  findPriorRuns,
  getEventHistoryContext,
  getEventMemory,
  getMemoryHintsForEvents,
} from "@/lib/memory/queries";

export { buildCampaignMemorySummary } from "@/lib/memory/summary";
export { buildMemoryTimeline } from "@/lib/memory/timeline";
export { buildLessonsLearnedState } from "@/lib/memory/lessons";
export { buildReusePreview } from "@/lib/memory/reuse";

/**
 * Future AI integration points (Insight Engine):
 *
 * - compareEventMemory(current, priorRuns) → "What changed since last year?"
 * - summarizeWhatWorked(memory) → "What worked?"
 * - suggestImprovements(memory, priorRuns) → "What should we improve?"
 *
 * Use EventMemoryComparisonContext as the stable input shape.
 * Narrative fields (campaignSummary.narrative, timeline, lessonsLearned)
 * are designed for prompt context without schema changes.
 */
