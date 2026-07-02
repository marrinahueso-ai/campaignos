import type { AiReviewResult, CreativeBrief } from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";

export function runAiArtworkReview(input: {
  asset: EventAsset;
  brief: CreativeBrief;
  brandColors: string[];
}): AiReviewResult {
  const suggestions: string[] = [];
  const { asset, brief, brandColors } = input;

  if (asset.status !== "uploaded") {
    return {
      verdict: "suggestions",
      suggestions: ["Upload artwork before running a creative review."],
      checkedAt: new Date().toISOString(),
    };
  }

  if (!asset.filename) {
    suggestions.push("Add a descriptive filename for easier organization.");
  }

  if (brandColors.length > 0) {
    suggestions.push(
      `Confirm school brand colors (${brandColors.join(", ")}) appear in the artwork.`,
    );
  } else {
    suggestions.push("Add approved school colors to Brand Kit for color checks.");
  }

  if (brief.consistencyRules.length > 0) {
    suggestions.push(`Check consistency: ${brief.consistencyRules[0]}`);
  }

  if (
    asset.assetType === "instagram_story" ||
    asset.assetType === "instagram_graphic" ||
    asset.assetType === "square_graphic"
  ) {
    suggestions.push("Verify social crop safety — keep key content inside the center safe zone.");
  }

  if (asset.assetType === "flyer" || asset.assetType === "pdf") {
    suggestions.push("Confirm print margins and readable body text at arm's length.");
  }

  if (asset.assetType === "hero_image" || asset.assetType === "newsletter_banner") {
    suggestions.push("Leave clear space for event title overlay and readable contrast.");
  }

  suggestions.push("Confirm logo placement follows brand guidelines.");

  const critical = suggestions.length <= 2;
  return {
    verdict: critical ? "looks_good" : "suggestions",
    suggestions: critical ? [] : suggestions,
    checkedAt: new Date().toISOString(),
  };
}
