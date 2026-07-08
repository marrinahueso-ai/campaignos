import "server-only";

import { resolveOpenAiImageSize } from "@/lib/ai-artwork/constants";
import { createConceptBatchId } from "@/lib/ai-artwork/mutations";
import { isArtworkGenerationConfigured } from "@/lib/ai-artwork/provider";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { logAiUsage } from "@/lib/ai/usage";
import { canUploadCampaignAssets } from "@/lib/creative-assets/permissions";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import {
  resolveBrandContextForGeneration,
} from "@/lib/campaign-builder-v2/brand-context";
import { mergeInspirationImageUrls } from "@/lib/campaign-builder-v2/inspiration-utils";
import { generateArtworkV2ImageNative } from "@/lib/artwork-v2/orchestrator";
import { resolveArtworkGenerationProfile } from "@/lib/artwork-v2/generation-mode";
import { resolveMetaCaptionModel } from "@/lib/meta-captions/constants";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { sanitizeEventAssetFilename } from "@/lib/event-workspace/storage";
import { buildCampaignBuilderCaptionPrompts } from "@/lib/campaign-builder-v2/caption-prompts";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";
import type { ImageSizePreset } from "@/lib/ai-artwork/types";

function imageSizePresetForView(view: ArtworkView): ImageSizePreset {
  return view === "story" ? "story" : "square";
}

function buildGeneratedArtworkStoragePath(input: {
  eventId: string;
  milestoneId: string;
  view: ArtworkView;
  batchId: string;
  index: number;
}): string {
  const filename = sanitizeEventAssetFilename(
    `${input.view}-${input.index}.png`,
  );
  return `${input.eventId}/campaign-builder-v2/generated/${input.milestoneId}/${input.batchId}/${filename}`;
}

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
}): string {
  const formatHint =
    input.view === "story"
      ? "vertical 9:16 story format for Facebook and Instagram Stories"
      : "square 1:1 feed format for Facebook and Instagram feeds";

  const artworkParts = [
    input.inspiration.globalAiGuidance.trim(),
    input.milestone.artworkNotes.trim(),
    input.milestone.purpose.trim(),
    input.extraInstructions?.trim() ?? "",
  ].filter(Boolean);

  const lines = [
    input.storyFromFeed
      ? `Create a ${input.milestone.name} version of the attached feed artwork in ${formatHint}.`
      : `Create campaign artwork for "${input.milestone.name}" in ${formatHint}.`,
    "",
    `Campaign: ${input.inspiration.campaignName}`,
    `Event date: ${input.inspiration.eventDate}`,
    `Milestone date: ${input.milestone.suggestedDate}`,
    `Purpose: ${input.milestone.purpose}`,
    input.inspiration.voiceTone.trim()
      ? `Voice / tone: ${input.inspiration.voiceTone.trim()}`
      : null,
  ].filter((line): line is string => Boolean(line));

  if (artworkParts.length > 0) {
    lines.push("", "Art direction:", artworkParts.join(". "));
  }

  if (input.brandGuidance) {
    lines.push("", "Brand kit:", input.brandGuidance);
  }

  if (input.hasInspirationImages) {
    lines.push(
      "",
      input.storyFromFeed
        ? "Keep the same visual style, colors, and branding as the attached feed design. Adapt layout for vertical story safe zones."
        : "Use the attached inspiration images for style, color palette, and visual mood. Do not copy them literally — create original campaign artwork in that style.",
    );
  }

  if (input.styleStrength != null) {
    lines.push("", styleStrengthLabel(input.styleStrength));
  }

  lines.push("", "Include the event name and key date on the graphic when appropriate.");

  return lines.join("\n");
}

async function generateArtworkVariations(input: {
  eventId: string;
  milestoneId: string;
  view: ArtworkView;
  userPrompt: string;
  inspirationImageUrls: string[];
  previousImageUrl?: string | null;
  adjustmentComments?: string | null;
  versionCount: number;
}): Promise<{ success: boolean; urls: string[]; error?: string }> {
  if (!isArtworkGenerationConfigured()) {
    return {
      success: false,
      urls: [],
      error: "AI artwork generation is not configured.",
    };
  }

  const imageSizePreset = imageSizePresetForView(input.view);
  const size = resolveOpenAiImageSize(imageSizePreset);
  const batchId = createConceptBatchId();
  const profile = resolveArtworkGenerationProfile("quick");
  const urls: string[] = [];

  for (let index = 1; index <= input.versionCount; index += 1) {
    const orchestration =
      input.previousImageUrl && input.adjustmentComments
        ? {
            kind: "adjust" as const,
            userPrompt: input.userPrompt,
            adjustmentComments: input.adjustmentComments,
            previousImageUrl: input.previousImageUrl,
            inspirationImageUrls: input.inspirationImageUrls,
          }
        : {
            kind: "create" as const,
            userPrompt: input.userPrompt,
            inspirationImageUrls: input.inspirationImageUrls,
          };

    const result = await generateArtworkV2ImageNative(
      orchestration,
      size,
      input.eventId,
      {
        quality: profile.quality,
        reasoningEffort: profile.reasoning,
      },
    );

    if (!result.success || !result.imageBase64) {
      if (urls.length === 0) {
        return {
          success: false,
          urls: [],
          error: result.error ?? "Unable to generate artwork.",
        };
      }
      break;
    }

    const storagePath = buildGeneratedArtworkStoragePath({
      eventId: input.eventId,
      milestoneId: input.milestoneId,
      view: input.view,
      batchId,
      index,
    });
    const bytes = Buffer.from(result.imageBase64, "base64");
    const uploaded = await uploadArtworkBytes({ storagePath, bytes });

    if (!uploaded.success || !uploaded.publicUrl) {
      if (urls.length === 0) {
        return {
          success: false,
          urls: [],
          error: uploaded.error ?? "Could not save generated artwork.",
        };
      }
      break;
    }

    urls.push(uploaded.publicUrl);
  }

  return { success: urls.length > 0, urls };
}

export async function generateCampaignBuilderArtwork(input: {
  eventId: string;
  milestone: CampaignBuilderMilestone;
  view: ArtworkView;
  inspiration: CampaignBuilderInspiration;
  inspirationImageUrls: string[];
  brandKitId: string | null;
  useBrandKit: boolean;
  styleStrength?: number;
  extraInstructions?: string | null;
  adjustmentComments?: string | null;
  previousImageUrl?: string | null;
  storyFromFeed?: boolean;
  versionCount?: number;
}): Promise<{ success: boolean; variationUrls: string[]; message: string }> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return {
      success: false,
      variationUrls: [],
      message: "You do not have permission to generate artwork.",
    };
  }

  const brandContext = await resolveBrandContextForGeneration(input.useBrandKit);
  const baseInspirationUrls = mergeInspirationImageUrls(
    input.inspirationImageUrls,
    brandContext.logoUrls,
  );
  const inspirationUrls =
    input.storyFromFeed && input.previousImageUrl
      ? [input.previousImageUrl, ...baseInspirationUrls].slice(0, 4)
      : baseInspirationUrls;

  const userPrompt = buildCampaignBuilderArtworkPrompt({
    inspiration: input.inspiration,
    milestone: input.milestone,
    view: input.view,
    brandGuidance: brandContext.guidance,
    extraInstructions: input.adjustmentComments ? null : input.extraInstructions,
    hasInspirationImages: inspirationUrls.length > 0,
    storyFromFeed: Boolean(input.storyFromFeed),
    styleStrength: input.styleStrength,
  });

  const generation = await generateArtworkVariations({
    eventId: input.eventId,
    milestoneId: input.milestone.id,
    view: input.view,
    userPrompt,
    inspirationImageUrls: inspirationUrls,
    previousImageUrl: input.previousImageUrl,
    adjustmentComments: input.adjustmentComments,
    versionCount: input.versionCount ?? 1,
  });

  if (!generation.success) {
    return {
      success: false,
      variationUrls: [],
      message: generation.error ?? "Artwork generation failed.",
    };
  }

  return {
    success: true,
    variationUrls: generation.urls,
    message: "Artwork generated.",
  };
}

function normalizeCaption(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^caption:\s*/i, "")
    .trim();
}

export async function generateCampaignBuilderCaption(input: {
  eventId: string;
  inspiration: CampaignBuilderInspiration;
  milestone: CampaignBuilderMilestone;
  platform: "facebook" | "instagram";
  instructions?: string | null;
  tone?: string | null;
  currentCaption?: string | null;
  artworkImageUrl?: string | null;
  playbookName?: string | null;
}): Promise<{ success: boolean; caption: string; message: string }> {
  const role = await getCurrentCampaignRole();
  if (!canUploadCampaignAssets(role)) {
    return {
      success: false,
      caption: "",
      message: "You do not have permission to generate captions.",
    };
  }

  if (!isAiConfigured()) {
    return {
      success: false,
      caption: "",
      message: "AI caption generation is not configured.",
    };
  }

  const [event, organization] = await Promise.all([
    getEventById(input.eventId),
    getLatestOrganization(),
  ]);

  if (!event) {
    return {
      success: false,
      caption: "",
      message: "Event not found.",
    };
  }

  const revisionInstructions = [
    input.instructions?.trim() ?? "",
    input.tone?.trim() ? `Tone: ${input.tone.trim()}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const prompts = buildCampaignBuilderCaptionPrompts({
    inspiration: input.inspiration,
    milestone: input.milestone,
    platform: input.platform,
    organizationName: organization?.name ?? null,
    playbookName: input.playbookName ?? null,
    artworkImageUrl: input.artworkImageUrl,
    existingCaption: input.currentCaption,
    revisionInstructions: revisionInstructions || null,
  });

  const model = resolveMetaCaptionModel();
  let generation = await generateText({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model,
    maxTokens: 500,
    imageUrl: prompts.hasArtworkImage ? input.artworkImageUrl : undefined,
  });

  if ((!generation.success || !generation.text?.trim()) && prompts.hasArtworkImage) {
    const fallbackPrompts = buildCampaignBuilderCaptionPrompts({
      ...input,
      organizationName: organization?.name ?? null,
      artworkImageUrl: null,
      existingCaption: input.currentCaption,
      revisionInstructions: revisionInstructions || null,
    });

    generation = await generateText({
      systemPrompt: fallbackPrompts.systemPrompt,
      userPrompt: fallbackPrompts.userPrompt,
      model,
      maxTokens: 500,
    });
  }

  if (!generation.success || !generation.text?.trim()) {
    await logAiUsage({
      eventId: input.eventId,
      actionType: "meta_social_caption",
      channel: input.platform,
      model: generation.model,
      promptTokens: generation.promptTokens,
      completionTokens: generation.completionTokens,
      totalTokens: generation.totalTokens,
      success: false,
      errorMessage: generation.error,
    });

    return {
      success: false,
      caption: "",
      message: generation.error ?? "Caption generation failed.",
    };
  }

  const caption = normalizeCaption(generation.text);

  await logAiUsage({
    eventId: input.eventId,
    actionType: "meta_social_caption",
    channel: input.platform,
    model: generation.model,
    promptTokens: generation.promptTokens,
    completionTokens: generation.completionTokens,
    totalTokens: generation.totalTokens,
    success: true,
  });

  return {
    success: true,
    caption,
    message: "Caption generated.",
  };
}
