import { INSPIRATION_STYLE_TAGS } from "@/lib/creative-director/constants";
import type { InspirationMatchResult } from "@/lib/creative-director/types";
import type { InspirationAsset } from "@/lib/creative-assets/types";
import type { CreativeBrief } from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";

function scoreTagOverlap(left: string[], right: string[]): number {
  const set = new Set(left.map((tag) => tag.toLowerCase()));
  return right.filter((tag) => set.has(tag.toLowerCase())).length;
}

export function inferInspirationTags(input: {
  brief: CreativeBrief;
  filename: string | null;
  assetType: string;
}): string[] {
  const tags = new Set<string>();
  const haystack = [
    input.brief.graphicStyle,
    input.brief.moodSummary,
    input.brief.visualDirection,
    input.filename ?? "",
    input.assetType,
  ]
    .join(" ")
    .toLowerCase();

  for (const tag of INSPIRATION_STYLE_TAGS) {
    if (haystack.includes(tag)) tags.add(tag);
  }

  if (input.brief.illustrationVsPhotography === "illustrated") tags.add("illustrated");
  if (input.brief.illustrationVsPhotography === "photography") tags.add("photo");
  if (tags.size === 0) tags.add("clean");

  return [...tags];
}

export function matchInspirationForAsset(input: {
  asset: EventAsset;
  tags: string[];
  inspirationAssets: InspirationAsset[];
  currentEventId: string;
}): InspirationMatchResult | null {
  const candidates = input.inspirationAssets.filter(
    (item) => item.eventId !== input.currentEventId && item.storagePath,
  );

  if (candidates.length === 0) return null;

  let best: InspirationAsset | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const typeBonus = candidate.assetType === input.asset.assetType ? 2 : 0;
    const tagScore = scoreTagOverlap(input.tags, candidate.tags);
    const score = tagScore + typeBonus;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best || bestScore === 0) return null;

  const useStyle = bestScore >= 3;
  return {
    message: useStyle
      ? `Use this style from ${best.eventTitle}.`
      : `This artwork is similar to ${best.eventTitle}.`,
    matchedAssetId: best.assetId,
    matchedEventTitle: best.eventTitle,
    recommendedAction: useStyle ? "use_style" : "similar",
  };
}
