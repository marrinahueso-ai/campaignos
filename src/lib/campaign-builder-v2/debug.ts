import "server-only";

import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
  MilestoneGenerationStatus,
} from "./types.ts";

const DEBUG_SCOPE = "campaign-builder-v2";

export function isCampaignBuilderDebugEnabled(): boolean {
  const raw = process.env.CAMPAIGN_BUILDER_DEBUG?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

function truncate(value: string, max = 120): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}… (${trimmed.length} chars)`;
}

/** Short stable fingerprint for correlating logs without dumping full prompts. */
export function promptFingerprint(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return `p${Math.abs(hash).toString(36)}`;
}

export function logCampaignBuilderDebug(
  scope: string,
  payload: Record<string, unknown>,
): void {
  if (!isCampaignBuilderDebugEnabled()) {
    return;
  }

  console.info(
    JSON.stringify({
      scope: `${DEBUG_SCOPE}:${scope}`,
      ts: new Date().toISOString(),
      ...payload,
    }),
  );
}

export function summarizeArtworkPromptSections(input: {
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  brandGuidance: string | null;
  extraInstructions?: string | null;
  hasInspirationImages: boolean;
  storyFromFeed: boolean;
  styleStrength?: number;
  hasAttachedLogo?: boolean;
}): string[] {
  const sections = ["format", "campaign_moment", "event_facts"];

  if (input.milestone.purpose.trim()) {
    sections.push("purpose");
  }
  if (input.inspiration.voiceTone.trim()) {
    sections.push("voice_tone");
  }
  if (
    input.inspiration.colorMode === "organization_palette" ||
    input.inspiration.colorMode === "inspiration_palette" ||
    input.inspiration.colorMode === "custom_palette"
  ) {
    sections.push("color_palette");
  }
  if (input.inspiration.includeLogoInArtwork && input.hasAttachedLogo) {
    sections.push("logo_attachment");
  }
  if (input.inspiration.inspirationOverallComment?.trim()) {
    sections.push("inspiration_overall_comment");
  }
  if (input.inspiration.globalAiGuidance.trim()) {
    sections.push("global_ai_guidance");
  }
  if (input.milestone.artworkNotes.trim() || input.extraInstructions?.trim()) {
    sections.push("user_art_direction");
  }

  sections.push("guardrails");

  if (input.brandGuidance) {
    sections.push("brand_kit");
  }
  if (input.hasInspirationImages) {
    sections.push(input.storyFromFeed ? "story_from_feed" : "inspiration_images");
  }
  if (input.styleStrength != null) {
    sections.push("style_strength");
  }

  return sections;
}

export function summarizeCaptionPromptSections(input: {
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  organizationName?: string | null;
  hasArtworkImage: boolean;
  revisionInstructions?: string | null;
  existingCaption?: string | null;
}): string[] {
  const sections = ["facts_block", "meta_caption_user", "platform_guide", "guardrails", "meta_caption_system"];

  if (input.organizationName?.trim()) {
    sections.push("organization_name");
  }
  if (input.milestone.captionNotes.trim()) {
    sections.push("caption_notes");
  }
  if (input.inspiration.globalAiGuidance.trim()) {
    sections.push("global_ai_guidance");
  }
  sections.push("voice_tone");
  if (input.hasArtworkImage) {
    sections.push("caption_artwork_rules");
  }
  if (input.revisionInstructions?.trim()) {
    sections.push("revision_instructions");
  }
  if (input.existingCaption?.trim()) {
    sections.push("existing_caption_draft");
  }

  return sections;
}

export function logArtworkGenerationDebug(input: {
  eventId: string;
  milestone: CampaignBuilderMilestone;
  view: ArtworkView;
  promptSections: string[];
  userPrompt: string;
  includeLogoInArtwork: boolean;
  hasAttachedLogo: boolean;
  inspirationImageCount: number;
  storyFromFeed: boolean;
  success: boolean;
  message?: string;
  generationRequestId?: string;
  milestoneOverrideApplied?: boolean;
}): void {
  logCampaignBuilderDebug("artwork", {
    eventId: input.eventId,
    milestoneId: input.milestone.id,
    milestoneName: input.milestone.name,
    generationRequestId: input.generationRequestId,
    view: input.view,
    promptSections: input.promptSections,
    promptLength: input.userPrompt.length,
    promptFingerprint: promptFingerprint(input.userPrompt),
    promptPreview: truncate(input.userPrompt),
    includeLogoInArtwork: input.includeLogoInArtwork,
    hasAttachedLogo: input.hasAttachedLogo,
    inspirationImageCount: input.inspirationImageCount,
    storyFromFeed: input.storyFromFeed,
    milestoneOverrideApplied: input.milestoneOverrideApplied,
    success: input.success,
    message: input.message,
  });
}

export function logCaptionGenerationDebug(input: {
  eventId: string;
  milestone: CampaignBuilderMilestone;
  platform: "facebook" | "instagram";
  promptSections: string[];
  systemPrompt: string;
  userPrompt: string;
  hasArtworkImage: boolean;
  success: boolean;
  message?: string;
  captionPreview?: string;
}): void {
  logCampaignBuilderDebug("caption", {
    eventId: input.eventId,
    milestoneId: input.milestone.id,
    milestoneName: input.milestone.name,
    platform: input.platform,
    promptSections: input.promptSections,
    systemPromptLength: input.systemPrompt.length,
    userPromptLength: input.userPrompt.length,
    systemPromptFingerprint: promptFingerprint(input.systemPrompt),
    userPromptFingerprint: promptFingerprint(input.userPrompt),
    userPromptPreview: truncate(input.userPrompt),
    hasArtworkImage: input.hasArtworkImage,
    success: input.success,
    message: input.message,
    captionPreview: input.captionPreview ? truncate(input.captionPreview, 200) : undefined,
  });
}

export function logGenerateAllContentDebug(input: {
  eventId: string;
  milestoneId: string;
  milestoneName: string;
  generationStatusBefore: MilestoneGenerationStatus | null;
  generationStatusAfter?: MilestoneGenerationStatus;
  phase: "start" | "complete" | "failed";
  message?: string;
}): void {
  logCampaignBuilderDebug("generate-all", {
    eventId: input.eventId,
    milestoneId: input.milestoneId,
    milestoneName: input.milestoneName,
    phase: input.phase,
    generationStatusBefore: input.generationStatusBefore,
    generationStatusAfter: input.generationStatusAfter,
    message: input.message,
  });
}
