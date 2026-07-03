import type { ArtworkV2ReviewVersion } from "@/lib/artwork-v2/types";

/** Default version count for refined (full) generation passes. */
export const ARTWORK_V2_VERSION_COUNT = 2;

/** Maximum inspiration images the user can attach in Artwork v2. */
export const ARTWORK_V2_MAX_INSPIRATION_IMAGES = 4;

export const DEFAULT_ARTWORK_ORCHESTRATOR_MODEL = "gpt-5.5";

export const DEFAULT_ARTWORK_IMAGE_QUALITY = "high";

export const DEFAULT_ARTWORK_REASONING_EFFORT = "medium";

export type ArtworkImageQuality = "low" | "medium" | "high" | "auto";

export type ArtworkReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";

export function resolveArtworkOrchestratorModel(): string {
  return process.env.OPENAI_ARTWORK_ORCHESTRATOR_MODEL?.trim() || DEFAULT_ARTWORK_ORCHESTRATOR_MODEL;
}

export function resolveArtworkImageQuality(): ArtworkImageQuality {
  const value = process.env.OPENAI_ARTWORK_IMAGE_QUALITY?.trim().toLowerCase();
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }
  return DEFAULT_ARTWORK_IMAGE_QUALITY;
}

export function resolveArtworkReasoningEffort(): ArtworkReasoningEffort {
  const value = process.env.OPENAI_ARTWORK_REASONING_EFFORT?.trim().toLowerCase();
  if (
    value === "none" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  ) {
    return value;
  }
  return DEFAULT_ARTWORK_REASONING_EFFORT;
}

export function createPlaceholderReviewVersions(): ArtworkV2ReviewVersion[] {
  return [
    { id: "preview-a", index: 1, imageUrl: null },
    { id: "preview-b", index: 2, imageUrl: null },
  ];
}

/** Assign sequential display numbers (1, 2, …) for the review grid. */
export function normalizeReviewVersionIndices(
  versions: ArtworkV2ReviewVersion[],
): ArtworkV2ReviewVersion[] {
  return versions.map((version, index) => ({
    ...version,
    index: index + 1,
  }));
}
