import type { MetaArtworkPlacement } from "@/lib/artwork-v2/campaign-phases";

export const ARTWORK_FORMAT_OPTIONS = [
  "Instagram Post (1:1)",
  "Instagram Story (9:16)",
  "Facebook Post (1:1)",
  "Facebook Story (9:16)",
] as const;

export type ArtworkFormatOption = (typeof ARTWORK_FORMAT_OPTIONS)[number];

export function formatLabelToMetaPlacement(format: string): MetaArtworkPlacement {
  return format.includes("Story") ? "story" : "feed";
}

export function metaPlacementToDefaultFormatLabel(
  placement: MetaArtworkPlacement,
): ArtworkFormatOption {
  return placement === "story" ? "Instagram Story (9:16)" : "Instagram Post (1:1)";
}

export function resolveArtworkPreviewAspectRatio(
  placement: MetaArtworkPlacement,
): "square" | "story" {
  return placement === "story" ? "story" : "square";
}
