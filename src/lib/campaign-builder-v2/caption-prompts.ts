import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import {
  describeAudienceFacingTiming,
  playbookRelativeDay,
} from "@/lib/campaign-builder-v2/campaign-timing";
import { isFirstCampaignMilestone } from "@/lib/campaign-builder-v2/first-milestone";
import {
  buildCaptionRevisionGuide,
  isDuplicateCaptionDirection,
} from "@/lib/campaign-builder-v2/caption-revision-prompt";
import {
  CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
  CAMPAIGN_BUILDER_CAPTION_ARTWORK_RULES,
  CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
  shouldIncludeOrganizationName,
} from "@/lib/campaign-builder-v2/prompt-guardrails";
import {
  buildMetaCaptionSystemPrompt,
  buildMetaCaptionUserPrompt,
} from "@/lib/meta-captions/prompts";
import type { MetaCaptionTone } from "@/lib/meta-captions/types";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";

export {
  buildCaptionRevisionGuide,
  isDuplicateCaptionDirection,
  normalizeCaptionDirectionText,
} from "@/lib/campaign-builder-v2/caption-revision-prompt";

function mapVoiceToneToMetaTone(voiceTone: string): MetaCaptionTone {
  if (!voiceTone.trim()) {
    return "Friendly";
  }
  const normalized = voiceTone.toLowerCase();
  if (normalized.includes("professional") || normalized.includes("informative")) {
    return "Professional";
  }
  if (
    normalized.includes("playful") ||
    normalized.includes("energetic") ||
    normalized.includes("exciting")
  ) {
    return "Enthusiastic";
  }
  if (normalized.includes("concise") || normalized.includes("direct")) {
    return "Concise";
  }
  return "Friendly";
}

export function buildCampaignBuilderCaptionFactsBlock(input: {
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  organizationName?: string | null;
  playbookName?: string | null;
}): string {
  const relativeDay = playbookRelativeDay(
    input.inspiration.eventDate,
    input.milestone.suggestedDate,
  );
  const isFirstMilestone = isFirstCampaignMilestone(input.milestone.sortOrder);
  const campaignMoment = resolveCampaignStage({
    relativeDay,
    stepTitle: input.milestone.name,
    eventDate: input.inspiration.eventDate,
    isFirstMilestone,
  });
  const timing = describeAudienceFacingTiming(relativeDay, { isFirstMilestone });

  const includeOrgName = shouldIncludeOrganizationName(
    input.organizationName,
    input.inspiration.globalAiGuidance,
    input.inspiration.campaignName,
    input.milestone.captionNotes,
    input.milestone.artworkNotes,
    input.milestone.purpose,
  );

  const lines = [
    `Campaign / event: ${input.inspiration.campaignName}`,
    `Event date: ${input.inspiration.eventDate}`,
    input.playbookName ? `Communication plan: ${input.playbookName}` : null,
    `Campaign moment: ${campaignMoment.label} — ${campaignMoment.description}`,
    `Timing for this post: ${timing.scheduleSummary}`,
    timing.onGraphicExamples.length > 0
      ? `Audience-facing timing phrases to weave into the caption (natural language, not milestone labels): ${timing.onGraphicExamples.join(" / ")}`
      : null,
    timing.guidance,
    `Internal milestone label (do not paste): ${input.milestone.name}`,
    `Internal scheduled post date (never include in caption unless user notes ask): ${input.milestone.suggestedDate}`,
    includeOrgName && input.organizationName
      ? `School/PTO: ${input.organizationName}`
      : null,
    input.inspiration.globalAiGuidance.trim()
      ? `Campaign voice guidance: ${input.inspiration.globalAiGuidance.trim()}`
      : null,
  ].filter(Boolean);

  return lines.join("\n");
}

export function buildCampaignBuilderCaptionPrompts(input: {
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  platform: "facebook" | "instagram";
  organizationName?: string | null;
  playbookName?: string | null;
  artworkImageUrl?: string | null;
  existingCaption?: string | null;
  revisionInstructions?: string | null;
}): { systemPrompt: string; userPrompt: string; hasArtworkImage: boolean } {
  const relativeDay = playbookRelativeDay(
    input.inspiration.eventDate,
    input.milestone.suggestedDate,
  );
  const isFirstMilestone = isFirstCampaignMilestone(input.milestone.sortOrder);
  const campaignMoment = resolveCampaignStage({
    relativeDay,
    stepTitle: input.milestone.name,
    eventDate: input.inspiration.eventDate,
    isFirstMilestone,
  });
  const hasArtworkImage = Boolean(input.artworkImageUrl?.trim());
  const factsBlock = buildCampaignBuilderCaptionFactsBlock(input);
  const tone = mapVoiceToneToMetaTone(input.inspiration.voiceTone);
  const captionNotesRaw = input.milestone.captionNotes.trim();
  const userRevisionInstructions = input.revisionInstructions?.trim() ?? "";
  const existingCaptionDraft = input.existingCaption?.trim() ?? "";

  // Prefer the regenerate "What should change?" channel when it duplicates
  // milestone captionNotes — avoid injecting the same direction twice.
  const captionNotes =
    captionNotesRaw &&
    userRevisionInstructions &&
    isDuplicateCaptionDirection(captionNotesRaw, userRevisionInstructions)
      ? ""
      : captionNotesRaw;

  const campaignRevisionGuide = userRevisionInstructions
    ? buildCaptionRevisionGuide({
        revisionInstructions: userRevisionInstructions,
        existingCaption: existingCaptionDraft,
      })
    : null;

  const platformGuide =
    input.platform === "facebook"
      ? "Write for Facebook — conversational, community-focused, easy to share with families."
      : "Write for Instagram — slightly punchier, still warm and human for school families.";

  const userPrompt = [
    buildMetaCaptionUserPrompt({
      placement: "feed",
      milestoneTitle: campaignMoment.label,
      timingLabel: campaignMoment.label,
      relativeDay,
      eventDate: input.inspiration.eventDate,
      factsBlock,
      existingFeedCaption: null,
      revisionContext: null,
      hasArtworkImage,
      tone,
      length: "Medium",
      feedCtaGuide:
        "End warmly — save the date or build excitement.",
    }),
    "",
    platformGuide,
    captionNotes
      ? `Milestone caption direction (interpret intent — do not copy verbatim): ${captionNotes}`
      : null,
    input.inspiration.globalAiGuidance.trim()
      ? `Global creative direction (interpret intent): ${input.inspiration.globalAiGuidance.trim()}`
      : null,
    input.inspiration.voiceTone.trim()
      ? `Voice / tone setting: ${input.inspiration.voiceTone}`
      : null,
    "",
    CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
    CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
    hasArtworkImage ? CAMPAIGN_BUILDER_CAPTION_ARTWORK_RULES : null,
    campaignRevisionGuide,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    systemPrompt: [
      buildMetaCaptionSystemPrompt({ hasArtworkImage }),
      CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
      CAMPAIGN_BUILDER_CAPTION_ARTWORK_RULES,
    ].join(" "),
    userPrompt,
    hasArtworkImage,
  };
}
