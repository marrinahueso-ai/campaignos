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
  resolveSelectedLogoForGeneration,
} from "@/lib/campaign-builder-v2/brand-context";
import { mergeInspirationImageUrls } from "@/lib/campaign-builder-v2/inspiration-utils";
import { generateArtworkV2ImageNative } from "@/lib/artwork-v2/orchestrator";
import { resolveArtworkGenerationProfile } from "@/lib/artwork-v2/generation-mode";
import { resolveMetaCaptionModel } from "@/lib/meta-captions/constants";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { sanitizeEventAssetFilename } from "@/lib/event-workspace/storage";
import { buildCampaignBuilderCaptionPrompts } from "@/lib/campaign-builder-v2/caption-prompts";
import {
  CAMPAIGN_BUILDER_ANTI_HALLUCINATION_RULES,
  CAMPAIGN_BUILDER_INTERPRET_DIRECTION_RULES,
  CAMPAIGN_BUILDER_LOGO_RULES,
  CAMPAIGN_BUILDER_MILESTONE_LABEL_RULES,
  CAMPAIGN_BUILDER_ON_GRAPHIC_TEXT_RULES,
} from "@/lib/campaign-builder-v2/prompt-guardrails";
import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
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
  hasAttachedLogo?: boolean;
}): string {
  const formatHint =
    input.view === "story"
      ? "vertical 9:16 story format for Facebook and Instagram Stories"
      : "square 1:1 feed format for Facebook and Instagram feeds";

  const relativeDay = (() => {
    const event = new Date(`${input.inspiration.eventDate}T12:00:00`);
    const milestone = new Date(`${input.milestone.suggestedDate}T12:00:00`);
    return Math.round((event.getTime() - milestone.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const campaignMoment = resolveCampaignStage({
    relativeDay,
    stepTitle: input.milestone.name,
    eventDate: input.inspiration.eventDate,
  });

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
    `Post date: ${input.milestone.suggestedDate}`,
    `Campaign moment: ${campaignMoment.label} — ${campaignMoment.description}`,
    `Internal milestone label (scheduling only — never use as on-graphic headline): ${input.milestone.name}`,
    input.milestone.purpose.trim()
      ? `Creative intent (internal — interpret, do not paste on graphic): ${input.milestone.purpose.trim()}`
      : null,
    input.inspiration.voiceTone.trim()
      ? `Voice / tone: ${input.inspiration.voiceTone.trim()}`
      : null,
    input.inspiration.useSchoolColors && input.inspiration.primarySchoolColor
      ? `Primary school color: ${input.inspiration.primarySchoolColor}`
      : null,
    input.inspiration.useSchoolColors && input.inspiration.secondarySchoolColor
      ? `Secondary school color: ${input.inspiration.secondarySchoolColor}`
      : null,
    input.inspiration.includeLogoInArtwork && input.hasAttachedLogo
      ? "Include the attached logo image as a visual brand element in the design."
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
        : "Use the attached inspiration images for style, color palette, and visual mood. Do not copy them literally — create original campaign artwork in that style.",
    );
  }

  if (input.styleStrength != null) {
    lines.push("", styleStrengthLabel(input.styleStrength));
  }

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
  const selectedLogo = await resolveSelectedLogoForGeneration({
    selectedLogoId: input.inspiration.selectedLogoId,
    includeLogoInArtwork: input.inspiration.includeLogoInArtwork,
  });
  const logoUrls = selectedLogo.url ? [selectedLogo.url] : [];
  const baseInspirationUrls = mergeInspirationImageUrls(
    input.inspirationImageUrls,
    logoUrls,
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
