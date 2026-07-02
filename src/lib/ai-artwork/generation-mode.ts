import type { ArtworkGenerationSettings } from "@/lib/ai-artwork/types";

/** Engine 10.0 — zero creative direction; only user prompt goes to the image model. */
export const HUMAN_DIRECTED_ARTWORK = true;

export const MANUAL_PROMPT_REQUIRED_MESSAGE =
  "Tell us what you want this artwork to look like first.";

export const MANUAL_PROMPT_PLACEHOLDER =
  "Describe the look and feel you want for this artwork.";

export function isHumanDirectedArtworkGeneration(): boolean {
  return HUMAN_DIRECTED_ARTWORK;
}

export function isArtworkDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ARTWORK_DEBUG === "1";
}

/** Final prompt sent to the image model — trimmed manual prompt only. */
export function resolveFinalArtworkImagePrompt(
  customPromptOverride: string | null | undefined,
): string {
  return customPromptOverride?.trim() ?? "";
}

/** @deprecated Use resolveFinalArtworkImagePrompt for generation. */
export function resolveStoredManualArtworkPrompt(
  customPromptOverride: string | null | undefined,
): string {
  return resolveFinalArtworkImagePrompt(customPromptOverride);
}

/** Trimmed check for required manual prompt validation only. */
export function resolveManualArtworkPrompt(
  customPromptOverride: string | null | undefined,
): string {
  return resolveFinalArtworkImagePrompt(customPromptOverride);
}

export function isManualArtworkPromptEmpty(
  customPromptOverride: string | null | undefined,
): boolean {
  return resolveFinalArtworkImagePrompt(customPromptOverride).length === 0;
}

/** Strip auto-inspiration and style-learning fields — only user-selected inspiration is kept. */
export function sanitizeHumanDirectedSettings(
  settings: ArtworkGenerationSettings,
): ArtworkGenerationSettings {
  return {
    ...settings,
    supportInspirationAssetIds: [],
    inspirationStrength: settings.inspirationAssetId ? "light" : settings.inspirationStrength,
    inspirationStyleProfile: null,
  };
}
