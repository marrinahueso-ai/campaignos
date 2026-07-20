import type { MetaArtworkPlacement } from "@/lib/artwork-v2/campaign-phases";
import type { AssetPlanItem, CreativePlanStatus } from "@/lib/creative-director/types";
import type { CommunicationChannel, EventAsset, EventAssetType } from "@/types/event-workspace";

export type ArtworkWorkflowStatus =
  | "not_started"
  | "ready"
  | "needs_changes"
  | "approved";

export interface ArtworkWorkflowItem {
  id: string;
  label: string;
  assetType: EventAssetType;
  /** Matches `AssetPlanItem.label` from the creative director plan when present. */
  planLabel: string;
  /** Present when artwork follows campaign timing — Meta format label (feed/story). */
  formatLabel?: string;
  metaPlacement?: MetaArtworkPlacement;
  relativeDay?: number;
  channel?: CommunicationChannel;
  communicationStepId?: string | null;
  channelLabel?: string;
}

/** Default social artwork outputs for every active campaign. */
export const DEFAULT_ARTWORK_WORKFLOW_ITEMS: ArtworkWorkflowItem[] = [
  {
    id: "facebook-feed",
    label: "Facebook Feed",
    assetType: "facebook_graphic",
    planLabel: "Facebook Graphic",
  },
  {
    id: "facebook-story",
    label: "Facebook Story",
    assetType: "facebook_graphic",
    planLabel: "Facebook Story",
  },
  {
    id: "instagram-feed",
    label: "Instagram Feed",
    assetType: "instagram_graphic",
    planLabel: "Instagram Square",
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    assetType: "instagram_story",
    planLabel: "Story Graphic",
  },
];

/** Optional artwork — shown when event type or existing progress warrants it. */
export const EXTENDED_ARTWORK_WORKFLOW_ITEMS: ArtworkWorkflowItem[] = [
  { id: "flyer", label: "Flyer", assetType: "flyer", planLabel: "Flyer" },
  {
    id: "website-banner",
    label: "Website Banner",
    assetType: "hero_image",
    planLabel: "Website Banner",
  },
  {
    id: "newsletter-header",
    label: "Newsletter Header",
    assetType: "newsletter_banner",
    planLabel: "Newsletter Banner",
  },
];

/** @deprecated Use getArtworkWorkflowItems() — full list for next-item navigation fallbacks. */
export const ARTWORK_WORKFLOW_ITEMS: ArtworkWorkflowItem[] = [
  ...EXTENDED_ARTWORK_WORKFLOW_ITEMS.filter((item) => item.id === "flyer"),
  ...DEFAULT_ARTWORK_WORKFLOW_ITEMS,
  ...EXTENDED_ARTWORK_WORKFLOW_ITEMS.filter((item) => item.id !== "flyer"),
];

export function mapPlanStatusToWorkflowStatus(
  status: CreativePlanStatus,
): ArtworkWorkflowStatus {
  switch (status) {
    case "approved":
    case "published":
      return "approved";
    case "generated":
      return "ready";
    case "in_progress":
      return "needs_changes";
    case "needed":
    default:
      return "not_started";
  }
}

export function workflowStatusLabel(status: ArtworkWorkflowStatus): string {
  switch (status) {
    case "not_started":
      return "Not Started";
    case "ready":
      return "Ready";
    case "needs_changes":
      return "Needs Changes";
    case "approved":
      return "Approved";
  }
}

export function workflowPrimaryActionLabel(status: ArtworkWorkflowStatus): string {
  switch (status) {
    case "not_started":
      return "Generate artwork";
    case "ready":
      return "Review";
    case "needs_changes":
      return "Continue";
    case "approved":
      return "Review";
  }
}

export function resolveWorkflowPlanItem(
  item: ArtworkWorkflowItem,
  plan: AssetPlanItem[],
): AssetPlanItem | null {
  return (
    plan.find((entry) => entry.label === item.planLabel) ??
    plan.find(
      (entry) => entry.assetType === item.assetType && entry.label === item.label,
    ) ??
    null
  );
}

export function resolveWorkflowAsset(
  item: ArtworkWorkflowItem,
  planItem: AssetPlanItem | null,
  assets: EventAsset[],
): EventAsset | null {
  if (planItem?.assetId) {
    const fromPlan = assets.find((asset) => asset.id === planItem.assetId) ?? null;
    if (fromPlan && planLabelsEquivalent(fromPlan.planLabel, item.planLabel)) {
      return fromPlan;
    }
  }

  const candidates = assets.filter(
    (asset) =>
      planLabelsEquivalent(asset.planLabel, item.planLabel) &&
      asset.assetType === item.assetType,
  );

  const preferred = pickPreferredArtworkAsset(candidates);
  if (!preferred) {
    return null;
  }

  if (item.metaPlacement === "story" && preferred.assetType !== "instagram_story") {
    return null;
  }

  if (
    item.metaPlacement === "feed" &&
    preferred.assetType === "instagram_story"
  ) {
    return null;
  }

  return preferred;
}

/** Match plan labels across hyphen/space and "Feed 1:1" vs "Feed (1:1)". */
export function planLabelMatchKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[–—]/g, " ")
    .replace(/[-\s]+/g, " ")
    .trim();
}

export function planLabelsEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) {
    return false;
  }
  return planLabelMatchKey(left) === planLabelMatchKey(right);
}

/** Prefer Create with AI uploads over older classic Artwork concepts. */
export function pickPreferredArtworkAsset(
  assets: EventAsset[],
): EventAsset | null {
  if (assets.length === 0) {
    return null;
  }

  if (assets.length === 1) {
    return assets[0] ?? null;
  }

  const scored = assets.map((asset) => {
    const path = asset.storagePath ?? "";
    const fromCampaignBuilder = path.includes("campaign-builder-v2") ? 2_000_000 : 0;
    const classicConcept = path.includes("/concepts/") ? -500_000 : 0;
    const approvedBoost =
      asset.planStatus === "approved" || asset.planStatus === "published"
        ? 500_000
        : 0;
    const updatedMs = Date.parse(asset.updatedAt ?? "") || 0;
    return {
      asset,
      score: fromCampaignBuilder + classicConcept + approvedBoost + updatedMs,
    };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.asset ?? null;
}

export function synthesizePlanItem(
  item: ArtworkWorkflowItem,
  asset: EventAsset | null,
): AssetPlanItem {
  return {
    assetId: asset?.id ?? null,
    assetType: item.assetType,
    label: item.label,
    planStatus: asset?.planStatus ?? (asset?.status === "uploaded" ? "approved" : "needed"),
    generationPrompt: asset?.generationPrompt ?? null,
    aiReview: asset?.aiReview ?? null,
    inspirationMatch: asset?.inspirationMatch ?? null,
    hasUpload: asset?.status === "uploaded",
    filename: asset?.filename ?? null,
    storagePath: asset?.storagePath ?? null,
    tags: asset?.tags ?? [],
    optional: false,
  };
}

export function nextWorkflowItem(
  currentId: string,
  items: ArtworkWorkflowItem[] = ARTWORK_WORKFLOW_ITEMS,
): ArtworkWorkflowItem | null {
  const index = items.findIndex((entry) => entry.id === currentId);
  if (index < 0 || index >= items.length - 1) return null;
  return items[index + 1] ?? null;
}
