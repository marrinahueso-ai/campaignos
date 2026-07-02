import "server-only";

import {
  parseCreativeDirection,
  rankAutoInspirationAssets,
} from "@/lib/ai-artwork/creative-direction";
import { isHumanDirectedArtworkGeneration } from "@/lib/ai-artwork/generation-mode";
import type { ArtworkGenerationSettings } from "@/lib/ai-artwork/types";
import type { CreativeBrief } from "@/lib/creative-director/types";
import type { CreativeDirectorContext } from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";

export function applyAutoInspirationToSettings(input: {
  settings: ArtworkGenerationSettings;
  asset: EventAsset;
  brief: CreativeBrief;
  context: CreativeDirectorContext;
}): ArtworkGenerationSettings {
  if (isHumanDirectedArtworkGeneration()) {
    return input.settings;
  }

  const creativeDirection = parseCreativeDirection(input.settings.creativeDirection);
  const ranked = rankAutoInspirationAssets({
    assetType: input.asset.assetType,
    brief: input.brief,
    inspirationAssets: input.context.inspirationAssets,
    currentEventId: input.context.event.id,
    limit: 3,
  });

  if (ranked.length === 0) {
    return input.settings;
  }

  const inspirationStrength =
    creativeDirection === "match_approved_style"
      ? "strong"
      : input.settings.inspirationStrength || "medium";

  if (input.settings.inspirationAssetId) {
    const supportInspirationAssetIds =
      input.settings.supportInspirationAssetIds.length > 0
        ? input.settings.supportInspirationAssetIds
        : ranked
            .filter((item) => item.assetId !== input.settings.inspirationAssetId)
            .slice(0, 2)
            .map((item) => item.assetId);

    return {
      ...input.settings,
      inspirationStrength,
      supportInspirationAssetIds,
    };
  }

  return {
    ...input.settings,
    inspirationAssetId: ranked[0].assetId,
    supportInspirationAssetIds: ranked.slice(1, 3).map((item) => item.assetId),
    inspirationStrength,
  };
}
