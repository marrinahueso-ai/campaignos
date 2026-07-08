import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import {
  buildMetaCaptionSystemPrompt,
  buildMetaCaptionUserPrompt,
} from "@/lib/meta-captions/prompts";
import type { MetaCaptionTone } from "@/lib/meta-captions/types";
import type {
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";

function daysUntilEvent(eventDate: string, milestoneDate: string): number {
  const event = new Date(`${eventDate}T12:00:00`);
  const milestone = new Date(`${milestoneDate}T12:00:00`);
  const diffMs = event.getTime() - milestone.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function mapVoiceToneToMetaTone(voiceTone: string): MetaCaptionTone {
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
  const lines = [
    `Campaign: ${input.inspiration.campaignName}`,
    `Event date: ${input.inspiration.eventDate}`,
    input.playbookName ? `Playbook: ${input.playbookName}` : null,
    `Milestone: ${input.milestone.name}`,
    `Milestone purpose: ${input.milestone.purpose}`,
    `Suggested post date: ${input.milestone.suggestedDate}`,
    input.organizationName ? `School/PTO: ${input.organizationName}` : null,
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
  const relativeDay = daysUntilEvent(
    input.inspiration.eventDate,
    input.milestone.suggestedDate,
  );
  const hasArtworkImage = Boolean(input.artworkImageUrl?.trim());
  const factsBlock = buildCampaignBuilderCaptionFactsBlock(input);
  const tone = mapVoiceToneToMetaTone(input.inspiration.voiceTone);
  const captionNotes = input.milestone.captionNotes.trim();
  const revisionContext =
    input.revisionInstructions?.trim() ||
    input.existingCaption?.trim() ||
    null;

  const platformGuide =
    input.platform === "facebook"
      ? "Write for Facebook — conversational, community-focused, easy to share with families."
      : "Write for Instagram — slightly punchier, still warm and human for school families.";

  const userPrompt = [
    buildMetaCaptionUserPrompt({
      placement: "feed",
      milestoneTitle: input.milestone.name,
      relativeDay,
      eventDate: input.inspiration.eventDate,
      factsBlock,
      existingFeedCaption: null,
      revisionContext,
      hasArtworkImage,
      tone,
      length: "Medium",
    }),
    "",
    platformGuide,
    captionNotes ? `Milestone caption notes (apply these): ${captionNotes}` : null,
    input.inspiration.globalAiGuidance.trim()
      ? `Global AI guidance: ${input.inspiration.globalAiGuidance.trim()}`
      : null,
    `Voice / tone setting: ${input.inspiration.voiceTone}`,
    "",
    `Campaign moment: ${resolveCampaignStage({
      relativeDay,
      stepTitle: input.milestone.name,
      eventDate: input.inspiration.eventDate,
    }).label}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    systemPrompt: buildMetaCaptionSystemPrompt({ hasArtworkImage }),
    userPrompt,
    hasArtworkImage,
  };
}
