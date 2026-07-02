import type { LessonsLearnedState } from "@/lib/memory/types";

const PLACEHOLDER_MESSAGE =
  "CampaignOS will remember notes for next year's event.";

/**
 * Placeholder until editable lessons are persisted.
 * Future: read from event_memory_lessons table or event metadata.
 */
export function buildLessonsLearnedState(
  storedLessons: string[] | null | undefined = null,
): LessonsLearnedState {
  const items = (storedLessons ?? []).filter((item) => item.trim().length > 0);

  return {
    hasContent: items.length > 0,
    items,
    placeholderMessage: PLACEHOLDER_MESSAGE,
  };
}
