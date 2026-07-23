import "server-only";

import { resolveOpenAiImageSize } from "@/lib/ai-artwork/constants";
import { createConceptBatchId } from "@/lib/ai-artwork/mutations";
import { isArtworkGenerationConfigured } from "@/lib/ai-artwork/provider";
import { uploadArtworkBytes } from "@/lib/ai-artwork/storage";
import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { hasPermission } from "@/lib/access-templates/effective-access";
import {
  resolveBrandContextForGeneration,
  resolveSelectedLogoForGeneration,
} from "@/lib/campaign-builder-v2/brand-context";
import { resolveMilestoneInspiration } from "@/lib/campaign-builder-v2/creative-config";
import { mergeInspirationImageUrls } from "@/lib/campaign-builder-v2/inspiration-utils";
import { generateArtworkV2ImageNative } from "@/lib/artwork-v2/orchestrator";
import { resolveArtworkGenerationProfile } from "@/lib/artwork-v2/generation-mode";
import { resolveMetaCaptionModel } from "@/lib/meta-captions/constants";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { sanitizeEventAssetFilename } from "@/lib/event-workspace/storage";
import { buildCampaignBuilderArtworkPrompt } from "@/lib/campaign-builder-v2/artwork-prompts";
import { buildCampaignBuilderCaptionPrompts } from "@/lib/campaign-builder-v2/caption-prompts";
import {
  logArtworkGenerationDebug,
  logCaptionGenerationDebug,
  summarizeArtworkPromptSections,
  summarizeCaptionPromptSections,
} from "@/lib/campaign-builder-v2/debug";
import type {
  ArtworkView,
  CampaignBuilderInspiration,
  CampaignBuilderMilestone,
} from "@/lib/campaign-builder-v2/types";
import type { ImageSizePreset } from "@/lib/ai-artwork/types";

export { buildCampaignBuilderArtworkPrompt } from "@/lib/campaign-builder-v2/artwork-prompts";

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

async function generateArtworkVariations(input: {
  eventId: string;
  milestoneId: string;
  view: ArtworkView;
  userPrompt: string;
  inspirationImageUrls: string[];
  previousImageUrl?: string | null;
  adjustmentComments?: string | null;
  versionCount: number;
}): Promise<{ success: boolean; urls: string[]; error?: string; batchId: string }> {
  const batchId = createConceptBatchId();

  if (!isArtworkGenerationConfigured()) {
    return {
      success: false,
      urls: [],
      error: "AI artwork generation is not configured.",
      batchId,
    };
  }

  const imageSizePreset = imageSizePresetForView(input.view);
  const size = resolveOpenAiImageSize(imageSizePreset);
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
          batchId,
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
          batchId,
        };
      }
      break;
    }

    urls.push(uploaded.publicUrl);
  }

  return { success: urls.length > 0, urls, batchId };
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
  if (!(await hasPermission("upload_artwork"))) {
    return {
      success: false,
      variationUrls: [],
      message: "You do not have permission to generate artwork.",
    };
  }

  // Resolve this milestone's explicit logo/colors overrides on top of the
  // campaign Creative Setup — never mutates input.inspiration and never
  // touches any other milestone's overrides.
  const resolvedInspiration = resolveMilestoneInspiration(
    input.inspiration,
    input.milestone.creativeOverrides,
  );

  const brandContext = await resolveBrandContextForGeneration(input.useBrandKit);
  const selectedLogo = await resolveSelectedLogoForGeneration({
    selectedLogoId: resolvedInspiration.selectedLogoId,
    includeLogoInArtwork: resolvedInspiration.includeLogoInArtwork,
    uploadedLogoUrl: resolvedInspiration.uploadedLogoUrl,
    uploadedLogoLabel: resolvedInspiration.uploadedLogoLabel,
  });
  // Selected logo first (explicit include), then org brand-kit logo URLs as
  // visual references — brandContext.logoUrls was previously unused.
  const logoUrls = [
    ...new Set([
      ...(selectedLogo.url ? [selectedLogo.url] : []),
      ...(input.useBrandKit ? brandContext.logoUrls : []),
    ]),
  ];
  const baseInspirationUrls = mergeInspirationImageUrls(
    input.inspirationImageUrls,
    logoUrls,
  );
  const inspirationUrls =
    input.storyFromFeed && input.previousImageUrl
      ? [input.previousImageUrl, ...baseInspirationUrls].slice(0, 4)
      : baseInspirationUrls;

  const userPrompt = buildCampaignBuilderArtworkPrompt({
    inspiration: resolvedInspiration,
    milestone: input.milestone,
    view: input.view,
    brandGuidance: brandContext.guidance,
    extraInstructions: input.adjustmentComments ? null : input.extraInstructions,
    hasInspirationImages: inspirationUrls.length > 0,
    storyFromFeed: Boolean(input.storyFromFeed),
    styleStrength: input.styleStrength,
    hasAttachedLogo: Boolean(selectedLogo.url),
  });

  const promptSections = summarizeArtworkPromptSections({
    inspiration: resolvedInspiration,
    milestone: input.milestone,
    brandGuidance: brandContext.guidance,
    extraInstructions: input.adjustmentComments ? null : input.extraInstructions,
    hasInspirationImages: inspirationUrls.length > 0,
    storyFromFeed: Boolean(input.storyFromFeed),
    styleStrength: input.styleStrength,
    hasAttachedLogo: Boolean(selectedLogo.url),
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

  logArtworkGenerationDebug({
    eventId: input.eventId,
    milestone: input.milestone,
    view: input.view,
    promptSections,
    userPrompt,
    includeLogoInArtwork: resolvedInspiration.includeLogoInArtwork,
    hasAttachedLogo: Boolean(selectedLogo.url),
    inspirationImageCount: inspirationUrls.length,
    storyFromFeed: Boolean(input.storyFromFeed),
    success: generation.success,
    message: generation.error,
    generationRequestId: generation.batchId,
    milestoneOverrideApplied: Boolean(input.milestone.creativeOverrides),
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
  if (!(await hasPermission("upload_artwork"))) {
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

  const userInstructions = input.instructions?.trim() ?? "";
  const toneOverride =
    input.tone?.trim() &&
    input.tone.trim().toLowerCase() !== input.inspiration.voiceTone.trim().toLowerCase()
      ? input.tone.trim()
      : null;

  const revisionInstructions = [userInstructions, toneOverride ? `Tone: ${toneOverride}` : ""]
    .filter(Boolean)
    .join(". ");

  const existingCaption =
    userInstructions && input.currentCaption?.trim() ? input.currentCaption : null;

  const prompts = buildCampaignBuilderCaptionPrompts({
    inspiration: input.inspiration,
    milestone: input.milestone,
    platform: input.platform,
    organizationName: organization?.name ?? null,
    playbookName: input.playbookName ?? null,
    artworkImageUrl: input.artworkImageUrl,
    existingCaption,
    revisionInstructions: revisionInstructions || null,
  });

  const captionPromptSections = summarizeCaptionPromptSections({
    inspiration: input.inspiration,
    milestone: input.milestone,
    organizationName: organization?.name ?? null,
    hasArtworkImage: prompts.hasArtworkImage,
    revisionInstructions: revisionInstructions || null,
    existingCaption,
  });

  const model = resolveMetaCaptionModel();
  const captionUsage = {
    actionType: "meta_social_caption" as const,
    eventId: input.eventId,
    organizationId: organization?.id ?? null,
    channel: input.platform,
    feature: "create_with_ai_caption",
  };

  let generation = await generateText({
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    model,
    maxTokens: 500,
    imageUrl: prompts.hasArtworkImage ? input.artworkImageUrl : undefined,
    usage: captionUsage,
  });

  if ((!generation.success || !generation.text?.trim()) && prompts.hasArtworkImage) {
    const fallbackPrompts = buildCampaignBuilderCaptionPrompts({
      inspiration: input.inspiration,
      milestone: input.milestone,
      platform: input.platform,
      organizationName: organization?.name ?? null,
      playbookName: input.playbookName ?? null,
      artworkImageUrl: null,
      existingCaption,
      revisionInstructions: revisionInstructions || null,
    });

    generation = await generateText({
      systemPrompt: fallbackPrompts.systemPrompt,
      userPrompt: fallbackPrompts.userPrompt,
      model,
      maxTokens: 500,
      usage: captionUsage,
    });
  }

  if (!generation.success || !generation.text?.trim()) {
    logCaptionGenerationDebug({
      eventId: input.eventId,
      milestone: input.milestone,
      platform: input.platform,
      promptSections: captionPromptSections,
      systemPrompt: prompts.systemPrompt,
      userPrompt: prompts.userPrompt,
      hasArtworkImage: prompts.hasArtworkImage,
      success: false,
      message: generation.error ?? "Caption generation failed.",
    });

    return {
      success: false,
      caption: "",
      message: generation.error ?? "Caption generation failed.",
    };
  }

  const caption = normalizeCaption(generation.text);

  logCaptionGenerationDebug({
    eventId: input.eventId,
    milestone: input.milestone,
    platform: input.platform,
    promptSections: captionPromptSections,
    systemPrompt: prompts.systemPrompt,
    userPrompt: prompts.userPrompt,
    hasArtworkImage: prompts.hasArtworkImage,
    success: true,
    captionPreview: caption,
  });

  return {
    success: true,
    caption,
    message: "Caption generated.",
  };
}
