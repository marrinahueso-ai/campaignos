import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import {
  describeAudienceFacingTiming,
  playbookRelativeDay,
} from "@/lib/campaign-builder-v2/campaign-timing";
import {
  CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
  CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
  CAMPAIGN_BUILDER_LOGO_RULES,
  CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES,
  CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
} from "@/lib/campaign-builder-v2/prompt-guardrails";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";

function styleStrengthLabel(styleStrength: number): string {
  if (styleStrength < 35) {
    return "Take more creative liberty while staying on brief.";
  }
  if (styleStrength > 65) {
    return "Stay very close to the reference style and layout.";
  }
  return "Balance creative variation with reference style fidelity.";
}

export function buildCampaignBuilderArtworkPrompt(input: {
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  view: ArtworkView;
  brandGuidance: string | null;
  extraInstructions?: string | null;
  hasInspirationImages: boolean;
  storyFromFeed: boolean;
  styleStrength?: number;
  hasAttachedLogo?: boolean;
}): string {
  const formatHint =
    input.view === "story"
      ? "vertical 9:16 story format for Facebook and Instagram Stories"
      : "square 1:1 feed format for Facebook and Instagram feeds";

  const relativeDay = playbookRelativeDay(
    input.inspiration.eventDate,
    input.milestone.suggestedDate,
  );

  const campaignMoment = resolveCampaignStage({
    relativeDay,
    stepTitle: input.milestone.name,
    eventDate: input.inspiration.eventDate,
  });

  const timing = describeAudienceFacingTiming(relativeDay);

  const userArtDirection = [
    input.milestone.artworkNotes.trim(),
    input.extraInstructions?.trim() ?? "",
  ].filter(Boolean);

  const lines = [
    input.storyFromFeed
      ? `Create a ${campaignMoment.label.toLowerCase()} story adaptation of the attached feed artwork in ${formatHint}.`
      : `Create campaign artwork for a ${campaignMoment.label.toLowerCase()} social post in ${formatHint}.`,
    "",
    `Campaign / event: ${input.inspiration.campaignName}`,
    `Event date: ${input.inspiration.eventDate}`,
    `Internal scheduled post date (never render on graphic): ${input.milestone.suggestedDate}`,
    `Internal milestone label (never render on graphic): ${input.milestone.name}`,
    `Campaign moment: ${campaignMoment.label} — ${campaignMoment.description}`,
    `Timing for this post: ${timing.scheduleSummary}`,
    timing.onGraphicExamples.length > 0
      ? `Audience-facing timing to express on the graphic (pick one short phrase, do not invent logistics): ${timing.onGraphicExamples.join(" / ")}`
      : null,
    timing.guidance,
    input.milestone.purpose.trim()
      ? `Creative intent (internal — interpret, do not paste on graphic): ${input.milestone.purpose.trim()}`
      : null,
    input.inspiration.voiceTone.trim()
      ? `Voice / tone: ${input.inspiration.voiceTone.trim()}`
      : null,
    input.inspiration.colorMode === "organization_palette" &&
      input.inspiration.primarySchoolColor
      ? `Primary organization color: ${input.inspiration.primarySchoolColor}`
      : null,
    input.inspiration.colorMode === "organization_palette" &&
      input.inspiration.secondarySchoolColor
      ? `Secondary organization color: ${input.inspiration.secondarySchoolColor}`
      : null,
    input.inspiration.colorMode === "inspiration_palette" &&
      input.hasInspirationImages
      ? "Color palette: derive colors from the attached inspiration images."
      : null,
    input.inspiration.colorMode === "custom_palette" &&
      (input.inspiration.customPaletteColors?.length ?? 0) > 0
      ? `Custom palette colors: ${input.inspiration.customPaletteColors.join(", ")}`
      : null,
    input.inspiration.includeLogoInArtwork && input.hasAttachedLogo
      ? "Include the attached logo image as a visual brand element in the design."
      : null,
    input.inspiration.inspirationOverallComment?.trim() &&
      input.hasInspirationImages
      ? `Inspiration notes (interpret — do not paste on graphic): ${input.inspiration.inspirationOverallComment.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line));

  if (input.inspiration.globalAiGuidance.trim()) {
    lines.push(
      "",
      "Global creative direction (interpret intent — do not paste verbatim on the graphic):",
      input.inspiration.globalAiGuidance.trim(),
    );
  }

  if (userArtDirection.length > 0) {
    lines.push(
      "",
      "Artwork direction from the user (interpret into polished visuals — do not paste these words literally on the graphic):",
      userArtDirection.join(". "),
    );
  }

  lines.push(
    "",
    CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
    CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
    CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES,
    CAMPAIGN_BUILDER_LOGO_RULES,
    CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
    "Only include event name and date on the graphic when it fits the design — do not add logistics you were not given.",
  );

  if (input.brandGuidance) {
    lines.push("", "Brand kit (colors, fonts, voice — not literal copy to paste):", input.brandGuidance);
  }

  if (input.hasInspirationImages) {
    lines.push(
      "",
      input.storyFromFeed
        ? "Keep the same visual style, colors, and branding as the attached feed design. Adapt layout for vertical story safe zones."
        : "Use the attached inspiration images for composition, layout, visual hierarchy, style, color palette, and visual mood.",
    );

    const imageComments = input.inspiration.inspirationImages
      .map((image, index) => {
        const comment = image.comment?.trim();
        if (!comment) {
          return null;
        }
        return `Image ${index + 1} (${image.label}): ${comment}`;
      })
      .filter((line): line is string => Boolean(line));

    if (imageComments.length > 0) {
      lines.push(
        "Per-image inspiration notes (interpret — do not paste on graphic):",
        ...imageComments,
      );
    }
  }

  if (input.styleStrength != null) {
    lines.push("", styleStrengthLabel(input.styleStrength));
  }

  return lines.join("\n");
}
