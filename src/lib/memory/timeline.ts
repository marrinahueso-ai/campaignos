import type { ActivityLogEntry } from "@/types/event-workspace";
import type { MemoryTimelineEntry } from "@/lib/memory/types";

const ACTIVITY_TITLES: Partial<Record<ActivityLogEntry["activityType"], string>> = {
  calendar_imported: "Added from the school calendar",
  workspace_created: "Event workspace opened",
  communications_generated: "Messages drafted",
  board_approval: "Board approval recorded",
  published: "Something went live",
  event_completed: "Event marked complete",
};

function humanizeActivity(entry: ActivityLogEntry): MemoryTimelineEntry {
  const title = ACTIVITY_TITLES[entry.activityType] ?? entry.title;
  const tone: MemoryTimelineEntry["tone"] =
    entry.activityType === "published" ||
    entry.activityType === "event_completed" ||
    entry.activityType === "board_approval"
      ? "milestone"
      : entry.activityType === "communications_generated"
        ? "complete"
        : "neutral";

  return {
    id: entry.id,
    title,
    description: entry.description,
    occurredAt: entry.occurredAt,
    tone,
  };
}

export function buildMemoryTimeline(
  activityLog: ActivityLogEntry[],
): MemoryTimelineEntry[] {
  if (activityLog.length === 0) {
    return [];
  }

  return [...activityLog]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map(humanizeActivity);
}
