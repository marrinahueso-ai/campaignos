import { getCreativeAssetTypeLabel } from "@/lib/creative-assets/constants";
import {
  buildVerifiedEventFacts,
  formatVerifiedEventFactsLines,
} from "@/lib/ai-artwork/event-facts";
import { buildArtworkTextPlan } from "@/lib/ai-artwork/text-plan";
import type {
  AssetPlanSpec,
  CreativeBrief,
  CreativeDirectorContext,
} from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";

function layoutHint(assetType: string): string {
  if (assetType === "instagram_graphic" || assetType === "square_graphic") {
    return "1:1 square layout with blank headline band at top.";
  }
  if (assetType === "instagram_story") {
    return "9:16 vertical story layout with blank text-safe zones.";
  }
  if (assetType === "newsletter_banner" || assetType === "email_header") {
    return "Wide banner layout with blank headline strip — no rendered text.";
  }
  if (assetType === "flyer") {
    return "Print-ready flyer background with reserved blank blocks for headline, details, and CTA.";
  }
  return "Landscape layout with blank regions for headline and event detail overlays.";
}

export function buildSmartPromptForAsset(input: {
  brief: CreativeBrief;
  spec: AssetPlanSpec;
  context: CreativeDirectorContext;
  asset: EventAsset | null;
}): string {
  const { brief, spec, context } = input;
  const label = spec.label;
  const typeLabel = getCreativeAssetTypeLabel(spec.assetType);
  const colors =
    brief.colorPalette.length > 0
      ? brief.colorPalette.join(", ")
      : context.brandColors.length > 0
        ? context.brandColors.join(" and ")
        : "organization brand colors";

  const styleLine = brief.graphicStyle || brief.visualDirection;
  const mood = brief.moodSummary || brief.emotionalTone.slice(0, 3).join(", ");

  const eventFacts = buildVerifiedEventFacts({
    event: context.event,
    organizationName: context.organizationName,
  });
  const textPlan = buildArtworkTextPlan({
    facts: eventFacts,
    brief,
    assetLabel: label,
  });

  const lines = [
    `Create background artwork (no rendered text) for ${label}.`,
    "",
    "Use only these event details. Do not invent dates, times, locations, or copy.",
    "",
    "VERIFIED EVENT FACTS",
    ...formatVerifiedEventFactsLines(eventFacts),
    "",
    `Visual theme: ${mood || "warm, welcoming campaign energy"}.`,
    styleLine ? `Visual style: ${styleLine}.` : null,
    `Use ${colors}.`,
    brief.typographySuggestions
      ? `Typography will be added later as overlays — do not render type in the image.`
      : null,
    layoutHint(spec.assetType),
    brief.doNotUse.length > 0 ? `Do not use: ${brief.doNotUse.join(", ")}.` : null,
    "",
    `Asset type: ${typeLabel}.`,
    `Overlay headline (not in image): ${textPlan.headline}.`,
    textPlan.dateTime ? `Overlay date/time (not in image): ${textPlan.dateTime}.` : null,
    textPlan.location ? `Overlay location (not in image): ${textPlan.location}.` : null,
    "Reserve clean blank areas for editable event detail text overlays.",
  ].filter(Boolean);

  return lines.join("\n");
}
