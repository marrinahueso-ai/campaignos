import type { EventMemory, ReusePreview, ReusePreviewItem } from "@/lib/memory/types";

function item(
  id: string,
  label: string,
  available: boolean,
  detail: string | null = null,
): ReusePreviewItem {
  return { id, label, available, detail };
}

/**
 * Describes what a future board could carry forward — preview only for now.
 * Structured for later "apply reuse" actions and AI diff prompts.
 */
export function buildReusePreview(memory: Pick<
  EventMemory,
  | "communicationsCreated"
  | "artworkUsed"
  | "timeline"
  | "publishingHistory"
  | "notes"
  | "filesUploaded"
>): ReusePreview {
  const draftCount = memory.communicationsCreated.filter(
    (entry) => entry.statusLabel !== "Not started",
  ).length;
  const artworkCount = memory.artworkUsed.filter(
    (entry) => entry.statusLabel === "Ready",
  ).length;
  const hasTimeline = memory.timeline.length > 0;
  const hasPublishing = memory.publishingHistory.length > 0;
  const hasNotes = !!(memory.notes && memory.notes.trim().length > 0);
  const hasFiles = memory.filesUploaded.length > 0;

  const items: ReusePreviewItem[] = [
    item(
      "drafts",
      "Communication drafts",
      draftCount > 0,
      draftCount > 0 ? `${draftCount} message${draftCount === 1 ? "" : "s"} ready to adapt` : null,
    ),
    item(
      "artwork",
      "Artwork",
      artworkCount > 0,
      artworkCount > 0 ? `${artworkCount} visual${artworkCount === 1 ? "" : "s"} on file` : null,
    ),
    item(
      "timeline",
      "Timeline",
      hasTimeline,
      hasTimeline ? "Step order and timing from this year" : null,
    ),
    item(
      "publishing",
      "Publishing schedule",
      hasPublishing,
      hasPublishing ? "Dates and channels from this run" : null,
    ),
    item(
      "notes",
      "Event notes",
      hasNotes,
      hasNotes ? "Overview and planning details" : null,
    ),
  ];

  if (hasFiles) {
    items.push(
      item(
        "files",
        "Uploaded files",
        true,
        `${memory.filesUploaded.length} file${memory.filesUploaded.length === 1 ? "" : "s"}`,
      ),
    );
  }

  return {
    items,
    hasReusableContent: items.some((entry) => entry.available),
  };
}
