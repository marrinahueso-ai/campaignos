import type {
  CreativeBrief,
  StyleMemoryEntry,
  StyleMemorySnapshot,
} from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";

export function buildStyleSnapshotFromApproval(input: {
  asset: EventAsset;
  brief: CreativeBrief;
}): StyleMemorySnapshot {
  const { asset, brief } = input;
  return {
    style: brief.graphicStyle || brief.visualDirection || "Campaign artwork",
    colors: brief.colorPalette.slice(0, 4),
    composition: asset.assetType.includes("story")
      ? "Vertical story composition"
      : "Balanced headline and artwork composition",
    illustrationType: brief.illustrationVsPhotography,
    fontStyle: brief.typographySuggestions || "Friendly school typography",
    tone: brief.moodSummary || brief.emotionalTone.slice(0, 3).join(", "),
  };
}

export function styleMemoryToBriefHint(entry: StyleMemoryEntry): string {
  return `Approved ${entry.assetType} from ${entry.eventTitle}: ${entry.style.style}`;
}
