import { DEFAULT_GENERATION_SETTINGS } from "@/lib/ai-artwork/constants";
import { parseArtworkMode } from "@/lib/ai-artwork/artwork-mode";
import { parseCreativeDirection } from "@/lib/ai-artwork/creative-direction";
import { parseInspirationStrength, parseInspirationStyleProfile } from "@/lib/ai-artwork/inspiration-style";
import { parseArtworkTextPlan } from "@/lib/ai-artwork/text-plan";
import type { ArtworkGenerationSettings } from "@/lib/ai-artwork/types";

/** Client-safe parser for generation_settings jsonb. */
export function parseGenerationSettings(value: unknown): ArtworkGenerationSettings {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_GENERATION_SETTINGS };
  }
  const record = value as Record<string, unknown>;
  const supportInspirationAssetIds = Array.isArray(record.supportInspirationAssetIds)
    ? record.supportInspirationAssetIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    artworkMode: parseArtworkMode(record.artworkMode),
    creativeDirection: parseCreativeDirection(record.creativeDirection),
    additionalInstructions:
      typeof record.additionalInstructions === "string"
        ? record.additionalInstructions
        : "",
    negativeInstructions:
      typeof record.negativeInstructions === "string" ? record.negativeInstructions : "",
    imageSizePreset:
      typeof record.imageSizePreset === "string"
        ? (record.imageSizePreset as ArtworkGenerationSettings["imageSizePreset"])
        : "square",
    customSize: typeof record.customSize === "string" ? record.customSize : null,
    style: typeof record.style === "string" ? record.style : "",
    inspirationAssetId:
      typeof record.inspirationAssetId === "string" ? record.inspirationAssetId : null,
    supportInspirationAssetIds,
    inspirationStrength: parseInspirationStrength(
      record.inspirationStrength,
      typeof record.inspirationAssetId === "string" ? record.inspirationAssetId : null,
    ),
    inspirationStyleProfile: parseInspirationStyleProfile(record.inspirationStyleProfile),
    textPlan: parseArtworkTextPlan(record.textPlan),
    customPromptOverride:
      typeof record.customPromptOverride === "string" ? record.customPromptOverride : null,
  };
}
