import {
  CORE_SOCIAL_ASSET_SPECS,
  EXTENDED_ASSET_PLAN_SPECS,
  OPTIONAL_ASSET_PLAN_SPECS,
} from "@/lib/creative-director/constants";
import { buildSmartPromptForAsset } from "@/lib/creative-director/build-prompts";
import { inferPlanStatus } from "@/lib/creative-director/plan-status";
import {
  FLYER_EVENT_TYPES,
  shouldShowArtworkWorkflow,
} from "@/lib/creative-studio/artwork-defaults";
import type {
  AssetPlanItem,
  AssetPlanSpec,
  CreativeBrief,
  CreativeDirectorContext,
} from "@/lib/creative-director/types";
import type { EventAsset } from "@/types/event-workspace";
import type { EventType } from "@/types/playbooks";

function findAssetForSpec(
  assets: EventAsset[],
  spec: AssetPlanSpec,
  usedIds: Set<string>,
): EventAsset | null {
  return (
    assets.find(
      (asset) =>
        !usedIds.has(asset.id) &&
        asset.planLabel === spec.label &&
        asset.assetType === spec.assetType,
    ) ?? null
  );
}

function hasExistingAssetForSpec(assets: EventAsset[], spec: AssetPlanSpec): boolean {
  return assets.some(
    (asset) =>
      asset.planLabel === spec.label &&
      asset.assetType === spec.assetType &&
      (asset.status === "uploaded" ||
        asset.planStatus === "generated" ||
        asset.planStatus === "approved" ||
        asset.planStatus === "in_progress"),
  );
}

function resolveSpecs(context: CreativeDirectorContext): AssetPlanSpec[] {
  if (!shouldShowArtworkWorkflow(context.event.communicationStrategy)) {
    return [];
  }

  const specs: AssetPlanSpec[] = [...CORE_SOCIAL_ASSET_SPECS];
  const eventType = (context.event.eventType as EventType | null) ?? null;

  if (eventType && FLYER_EVENT_TYPES.includes(eventType)) {
    const flyer = EXTENDED_ASSET_PLAN_SPECS.find((spec) => spec.label === "Flyer");
    if (flyer) specs.push(flyer);
  }

  for (const spec of EXTENDED_ASSET_PLAN_SPECS) {
    if (spec.label === "Flyer") continue;
    if (specs.some((entry) => entry.label === spec.label)) continue;
    if (hasExistingAssetForSpec(context.assets, spec)) {
      specs.push(spec);
    }
  }

  if (context.event.volunteerNeeds?.trim()) {
    for (const spec of OPTIONAL_ASSET_PLAN_SPECS) {
      if (!specs.some((entry) => entry.label === spec.label)) {
        specs.push(spec);
      }
    }
  }

  return specs;
}

export function buildAssetPlan(
  context: CreativeDirectorContext,
  brief: CreativeBrief,
): AssetPlanItem[] {
  const specs = resolveSpecs(context);
  const usedIds = new Set<string>();

  return specs.map((spec) => {
    const asset = findAssetForSpec(context.assets, spec, usedIds);
    if (asset) usedIds.add(asset.id);

    const planStatus = asset
      ? inferPlanStatus(asset, context.communications)
      : "needed";

    const generationPrompt =
      asset?.generationPrompt ??
      buildSmartPromptForAsset({ brief, spec, context, asset });

    return {
      assetId: asset?.id ?? null,
      assetType: spec.assetType,
      label: spec.label,
      planStatus,
      generationPrompt,
      aiReview: asset?.aiReview ?? null,
      inspirationMatch: asset?.inspirationMatch ?? null,
      hasUpload: asset?.status === "uploaded",
      filename: asset?.filename ?? null,
      storagePath: asset?.storagePath ?? null,
      tags: asset?.tags ?? [],
      optional: spec.optional ?? false,
    };
  });
}

export function buildCreativeProgressSummary(plan: AssetPlanItem[]): {
  total: number;
  approved: number;
  inProgress: number;
  needed: number;
} {
  return {
    total: plan.length,
    approved: plan.filter(
      (item) => item.planStatus === "approved" || item.planStatus === "published",
    ).length,
    inProgress: plan.filter(
      (item) =>
        item.planStatus === "in_progress" || item.planStatus === "generated",
    ).length,
    needed: plan.filter((item) => item.planStatus === "needed").length,
  };
}
