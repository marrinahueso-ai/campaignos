import { EVENT_ASSET_TYPES } from "@/lib/event-workspace/constants";
import type { ArtworkGroundingFact } from "@/lib/ai-grounding/types";
import type { EventAsset } from "@/types/event-workspace";

const VISUAL_ASSET_TYPES = new Set([
  "hero_image",
  "square_graphic",
  "instagram_story",
  "flyer",
  "logo",
]);

const ASSET_TYPE_LABELS = Object.fromEntries(
  EVENT_ASSET_TYPES.map(({ assetType, label }) => [assetType, label]),
) as Record<string, string>;

export function buildArtworkGroundingFacts(
  assets: EventAsset[],
): ArtworkGroundingFact[] {
  return assets
    .filter(
      (asset) =>
        asset.status === "uploaded" &&
        VISUAL_ASSET_TYPES.has(asset.assetType) &&
        !!(asset.filename?.trim() || asset.storagePath?.trim()),
    )
    .map((asset) => ({
      assetType: asset.assetType,
      assetTypeLabel: ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType,
      filename: asset.filename?.trim() || null,
      aiGenerated: asset.aiGenerated,
    }));
}

export function hasUploadedArtwork(facts: ArtworkGroundingFact[]): boolean {
  return facts.length > 0;
}
