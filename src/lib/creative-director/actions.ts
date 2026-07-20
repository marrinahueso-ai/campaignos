"use server";

import { revalidatePath } from "next/cache";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { runAiArtworkReview } from "@/lib/creative-director/ai-review";
import { buildCreativeBriefFromContext } from "@/lib/creative-director/build-brief";
import { buildCreativeDirectorContext } from "@/lib/creative-director/build-context";
import { buildSmartPromptForAsset } from "@/lib/creative-director/build-prompts";
import { CORE_ASSET_PLAN_SPECS } from "@/lib/creative-director/constants";
import { generateEnhancedCreativeBrief } from "@/lib/creative-director/generate-brief";
import {
  inferInspirationTags,
  matchInspirationForAsset,
} from "@/lib/creative-director/inspiration-match";
import {
  ensurePlanAssetRow,
  saveStyleMemoryEntry,
  updateAssetPlanFields,
  upsertCreativeBrief,
} from "@/lib/creative-director/mutations";
import { getCreativeBriefForEvent } from "@/lib/creative-director/queries";
import { buildStyleSnapshotFromApproval } from "@/lib/creative-director/style-memory";
import type { CreativeBrief, CreativePlanStatus } from "@/lib/creative-director/types";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";

export type CreativeDirectorActionState = {
  success: boolean;
  error: string | null;
};

function revalidateCreativeDirectorPaths(eventId: string): void {
  revalidatePath("/creative-studio");
  revalidateEventPaths(eventId);
}

export async function generateCreativeBriefAction(
  eventId: string,
): Promise<CreativeDirectorActionState & { brief?: CreativeBrief }> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to manage creative briefs." };
  }

  const event = await getEventById(eventId);
  if (!event) return { success: false, error: "Campaign not found." };

  const context = await buildCreativeDirectorContext(event);
  const { brief, isAiEnhanced } = await generateEnhancedCreativeBrief(context);
  const saved = await upsertCreativeBrief(eventId, brief, isAiEnhanced);
  if (!saved) {
    return { success: false, error: "Unable to save creative brief." };
  }

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null, brief };
}

export async function updateCreativeBriefAction(
  eventId: string,
  brief: CreativeBrief,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to edit the creative brief." };
  }

  const saved = await upsertCreativeBrief(eventId, brief, false);
  if (!saved) return { success: false, error: "Unable to save creative brief." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function updateAssetPromptAction(
  eventId: string,
  assetId: string,
  generationPrompt: string,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to edit prompts." };
  }

  const ok = await updateAssetPlanFields(eventId, assetId, { generationPrompt });
  if (!ok) return { success: false, error: "Unable to save prompt." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function updateAssetPlanStatusAction(
  eventId: string,
  assetId: string,
  planStatus: CreativePlanStatus,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to update asset status." };
  }

  const ok = await updateAssetPlanFields(eventId, assetId, { planStatus });
  if (!ok) return { success: false, error: "Unable to update status." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function regenerateAssetPromptAction(
  eventId: string,
  assetId: string,
  label: string,
  assetType: import("@/types/event-workspace").EventAssetType,
): Promise<CreativeDirectorActionState & { prompt?: string }> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to regenerate prompts." };
  }

  const event = await getEventById(eventId);
  if (!event) return { success: false, error: "Campaign not found." };

  const context = await buildCreativeDirectorContext(event);
  const stored = await getCreativeBriefForEvent(eventId);
  const brief = stored.brief ?? buildCreativeBriefFromContext(context);
  const spec =
    CORE_ASSET_PLAN_SPECS.find((entry) => entry.label === label) ?? {
      assetType,
      label,
      channels: [],
    };
  const assets = await getCampaignAssetsForEvent(eventId);
  const asset = assets.find((entry) => entry.id === assetId) ?? null;
  const prompt = buildSmartPromptForAsset({ brief, spec, context, asset });

  const ok = await updateAssetPlanFields(eventId, assetId, { generationPrompt: prompt });
  if (!ok) return { success: false, error: "Unable to save regenerated prompt." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null, prompt };
}

export async function runAssetReviewAction(
  eventId: string,
  assetId: string,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to run creative review." };
  }

  const event = await getEventById(eventId);
  if (!event) return { success: false, error: "Campaign not found." };

  const context = await buildCreativeDirectorContext(event);
  const stored = await getCreativeBriefForEvent(eventId);
  const brief = stored.brief ?? buildCreativeBriefFromContext(context);
  const asset = context.assets.find((entry) => entry.id === assetId);
  if (!asset) return { success: false, error: "Asset not found." };

  const review = runAiArtworkReview({
    asset,
    brief,
    brandColors: context.brandColors,
  });

  const ok = await updateAssetPlanFields(eventId, assetId, { aiReview: review });
  if (!ok) return { success: false, error: "Unable to save review." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function refreshInspirationMatchAction(
  eventId: string,
  assetId: string,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to refresh inspiration." };
  }

  const event = await getEventById(eventId);
  if (!event) return { success: false, error: "Campaign not found." };

  const context = await buildCreativeDirectorContext(event);
  const stored = await getCreativeBriefForEvent(eventId);
  const brief = stored.brief ?? buildCreativeBriefFromContext(context);
  const asset = context.assets.find((entry) => entry.id === assetId);
  if (!asset) return { success: false, error: "Asset not found." };

  const tags = inferInspirationTags({
    brief,
    filename: asset.filename,
    assetType: asset.assetType,
  });
  const match = matchInspirationForAsset({
    asset,
    tags,
    inspirationAssets: context.inspirationAssets,
    currentEventId: eventId,
  });

  const ok = await updateAssetPlanFields(eventId, assetId, {
    tags,
    inspirationMatch: match,
  });
  if (!ok) return { success: false, error: "Unable to save inspiration match." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function approveAssetCreativeAction(
  eventId: string,
  assetId: string,
): Promise<CreativeDirectorActionState> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to approve artwork." };
  }

  const event = await getEventById(eventId);
  if (!event) return { success: false, error: "Campaign not found." };

  const organization = await getLatestOrganization();
  const context = await buildCreativeDirectorContext(event);
  const stored = await getCreativeBriefForEvent(eventId);
  const brief = stored.brief ?? buildCreativeBriefFromContext(context);
  const asset = context.assets.find((entry) => entry.id === assetId);
  if (!asset || asset.status !== "uploaded") {
    return { success: false, error: "Upload artwork before approving." };
  }

  const statusOk = await updateAssetPlanFields(eventId, assetId, {
    planStatus: "approved",
  });
  if (!statusOk) return { success: false, error: "Unable to mark asset approved." };

  if (organization) {
    await saveStyleMemoryEntry({
      organizationId: organization.id,
      sourceEventId: eventId,
      sourceAssetId: assetId,
      eventTitle: event.title,
      assetType: asset.assetType,
      style: buildStyleSnapshotFromApproval({ asset, brief }),
    });
  }

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null };
}

export async function ensurePlannerAssetAction(
  eventId: string,
  assetType: import("@/types/event-workspace").EventAssetType,
  planLabel: string,
): Promise<CreativeDirectorActionState & { assetId?: string }> {
  if (!(await hasPermission("upload_artwork"))) {
    return { success: false, error: "You do not have permission to manage the asset plan." };
  }

  const assetId = await ensurePlanAssetRow(eventId, assetType, planLabel);
  if (!assetId) return { success: false, error: "Unable to create planner asset row." };

  revalidateCreativeDirectorPaths(eventId);
  return { success: true, error: null, assetId };
}
