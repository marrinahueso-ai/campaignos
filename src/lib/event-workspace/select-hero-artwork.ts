import { EVENT_ASSET_TYPES } from "@/lib/event-workspace/constants";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import type {
  ApprovalRequest,
  CommunicationChannel,
  CommunicationItem,
  EventAsset,
  EventAssetType,
} from "@/types/event-workspace";

export type HeroArtworkSource =
  | "approved_asset"
  | "uploaded_asset"
  | "communication_artwork";

export type HeroArtworkCaption = "Artwork ready" | "Latest event artwork";

export type HeroArtworkAspectRatio = "square" | "four-three";

export interface HeroArtworkSelection {
  source: HeroArtworkSource;
  caption: HeroArtworkCaption;
  imageUrl: string | null;
  label: string;
  filename: string | null;
  aspectRatio: HeroArtworkAspectRatio;
  assetType: EventAssetType | null;
}

/** Hero card always uses 1:1 feed artwork — never story / 9:16 assets. */
const HERO_ASSET_TYPES = new Set<EventAssetType>([
  "hero_image",
  "flyer",
  "facebook_graphic",
  "instagram_graphic",
  "square_graphic",
  "newsletter_banner",
]);

const MILESTONE_FEED_ASSET_TYPES = new Set<EventAssetType>([
  "instagram_graphic",
  "square_graphic",
  "facebook_graphic",
]);

const VISUAL_COMMUNICATION_CHANNELS = new Set<CommunicationChannel>([
  "flyer",
  "instagram",
  "facebook",
]);

const CHANNEL_ASSET_TYPES: Partial<
  Record<CommunicationChannel, EventAssetType[]>
> = {
  flyer: ["flyer"],
  instagram: ["instagram_graphic", "square_graphic"],
  facebook: ["facebook_graphic", "hero_image", "square_graphic"],
};

const ASSET_TYPE_PRIORITY: Partial<Record<EventAssetType, number>> = {
  hero_image: 0,
  flyer: 1,
  facebook_graphic: 2,
  instagram_graphic: 3,
  square_graphic: 4,
  instagram_story: 5,
  newsletter_banner: 6,
  logo: 7,
  logo_used: 8,
  pdf: 9,
  document: 10,
  email_header: 11,
  canva_link: 12,
  miscellaneous: 13,
};

function getAssetLabel(assetType: EventAssetType): string {
  return (
    EVENT_ASSET_TYPES.find((entry) => entry.assetType === assetType)?.label ??
    assetType
  );
}

export function extractImageUrl(content: string | null): string | null {
  if (!content) {
    return null;
  }

  const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }

  const directMatch = content.match(
    /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|svg)(?:\?[^\s"'<>]*)?/i,
  );
  return directMatch?.[0] ?? null;
}

export { resolveAssetImageUrl } from "@/lib/event-workspace/storage";

function isUsableAsset(asset: EventAsset): boolean {
  return (
    asset.status === "uploaded" && Boolean(resolveAssetImageUrl(asset.storagePath))
  );
}

function isApprovedPlanAsset(asset: EventAsset): boolean {
  if (!isUsableAsset(asset)) {
    return false;
  }

  if (asset.planStatus === "in_progress" || asset.planStatus === "generated") {
    return false;
  }

  if (asset.planStatus === "approved" || asset.planStatus === "published") {
    return true;
  }

  // Legacy rows before plan_status was tracked (matches artwork-v2 UI).
  return asset.status === "uploaded";
}

function getApprovedCommunicationIds(
  communications: CommunicationItem[],
  approvalRequests: ApprovalRequest[],
): Set<string> {
  const ids = new Set<string>();

  for (const communication of communications) {
    if (
      communication.status === "approved" ||
      communication.status === "published"
    ) {
      ids.add(communication.id);
    }
  }

  for (const request of approvalRequests) {
    if (request.status === "approved" && request.communicationItemId) {
      ids.add(request.communicationItemId);
    }
  }

  return ids;
}

function sortVisualAssets(assets: EventAsset[]): EventAsset[] {
  return [...assets].sort((left, right) => {
    const dateComparison = right.updatedAt.localeCompare(left.updatedAt);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (
      (ASSET_TYPE_PRIORITY[left.assetType] ?? 99) -
      (ASSET_TYPE_PRIORITY[right.assetType] ?? 99)
    );
  });
}

/**
 * Oldest-created first — keeps the card tied to the first approved milestone feed.
 * Uses createdAt (not updatedAt) so regenerating that feed does not demote it.
 */
function sortVisualAssetsOldestFirst(assets: EventAsset[]): EventAsset[] {
  return [...assets].sort((left, right) => {
    const dateComparison = left.createdAt.localeCompare(right.createdAt);
    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (
      (ASSET_TYPE_PRIORITY[left.assetType] ?? 99) -
      (ASSET_TYPE_PRIORITY[right.assetType] ?? 99)
    );
  });
}

function getAssetTypeForChannel(
  channel: CommunicationChannel,
): EventAssetType | null {
  switch (channel) {
    case "flyer":
      return "flyer";
    case "instagram":
      return "square_graphic";
    case "facebook":
      return "hero_image";
    default:
      return null;
  }
}

function toAssetSelection(
  asset: EventAsset,
  source: HeroArtworkSource,
  caption: HeroArtworkCaption,
): HeroArtworkSelection | null {
  const imageUrl = resolveAssetImageUrl(asset.storagePath);
  if (!imageUrl) {
    return null;
  }

  return {
    source,
    caption,
    imageUrl,
    label: getAssetLabel(asset.assetType),
    filename: asset.filename,
    aspectRatio: "square",
    assetType: asset.assetType,
  };
}

function pickApprovedUploadedAsset(
  assets: EventAsset[],
  communications: CommunicationItem[],
  approvedCommunicationIds: Set<string>,
): HeroArtworkSelection | null {
  const approvedVisualCommunications = communications.filter(
    (communication) =>
      VISUAL_COMMUNICATION_CHANNELS.has(communication.channel) &&
      approvedCommunicationIds.has(communication.id),
  );

  for (const communication of approvedVisualCommunications) {
    const preferredAssetTypes =
      CHANNEL_ASSET_TYPES[communication.channel] ?? [];

    const matchedAsset = sortVisualAssets(
      assets.filter(
        (asset) =>
          preferredAssetTypes.includes(asset.assetType) && isUsableAsset(asset),
      ),
    )[0];

    if (matchedAsset) {
      const selection = toAssetSelection(
        matchedAsset,
        "approved_asset",
        "Artwork ready",
      );
      if (selection) {
        return selection;
      }
    }

    const imageUrl = extractImageUrl(communication.latestContent);
    if (imageUrl && communication.channel !== "instagram") {
      return {
        source: "communication_artwork",
        caption: "Artwork ready",
        imageUrl,
        label: communication.channel.replaceAll("_", " "),
        filename: null,
        aspectRatio: "square",
        assetType: getAssetTypeForChannel(communication.channel),
      };
    }
  }

  const approvedVisualAssets = sortVisualAssets(
    assets.filter(
      (asset) =>
        HERO_ASSET_TYPES.has(asset.assetType) && isUsableAsset(asset),
    ),
  );

  if (approvedVisualAssets.length > 0 && approvedCommunicationIds.size > 0) {
    const selection = toAssetSelection(
      approvedVisualAssets[0]!,
      "approved_asset",
      "Artwork ready",
    );
    if (selection) {
      return selection;
    }
  }

  return null;
}

function pickFeedForStoryMilestone(
  storyAsset: EventAsset,
  assets: EventAsset[],
): EventAsset | null {
  if (!storyAsset.planLabel) {
    return null;
  }

  return (
    sortVisualAssets(
      assets.filter(
        (asset) =>
          MILESTONE_FEED_ASSET_TYPES.has(asset.assetType) &&
          asset.planLabel === storyAsset.planLabel &&
          isUsableAsset(asset) &&
          isApprovedPlanAsset(asset),
      ),
    )[0] ?? null
  );
}

/** When only a story asset is approved, prefer feed from the same milestone. */
function pickApprovedStoryFallback(
  assets: EventAsset[],
): HeroArtworkSelection | null {
  const approvedStories = sortVisualAssets(
    assets.filter(
      (asset) =>
        asset.assetType === "instagram_story" && isApprovedPlanAsset(asset),
    ),
  );

  if (approvedStories.length === 0) {
    return null;
  }

  const newestStory = approvedStories[0]!;
  const feedFromMilestone = pickFeedForStoryMilestone(newestStory, assets);

  if (feedFromMilestone) {
    const selection = toAssetSelection(
      feedFromMilestone,
      "approved_asset",
      "Artwork ready",
    );
    if (selection) {
      return selection;
    }
  }

  return toAssetSelection(newestStory, "approved_asset", "Artwork ready");
}

function pickApprovedPlanAsset(assets: EventAsset[]): HeroArtworkSelection | null {
  const approvedAssets = assets.filter(
    (asset) => HERO_ASSET_TYPES.has(asset.assetType) && isApprovedPlanAsset(asset),
  );

  if (approvedAssets.length === 0) {
    return pickApprovedStoryFallback(assets);
  }

  // Prefer the promoted hero — Create with AI updates this for the first milestone.
  const heroImage = sortVisualAssets(
    approvedAssets.filter((asset) => asset.assetType === "hero_image"),
  )[0];
  if (heroImage) {
    const selection = toAssetSelection(heroImage, "approved_asset", "Artwork ready");
    if (selection) {
      return selection;
    }
  }

  const milestoneFeeds = sortVisualAssetsOldestFirst(
    approvedAssets.filter((asset) => MILESTONE_FEED_ASSET_TYPES.has(asset.assetType)),
  );

  if (milestoneFeeds.length > 0) {
    const firstMilestoneLabel = milestoneFeeds[0]!.planLabel;
    const feedsForFirstMilestone = sortVisualAssets(
      milestoneFeeds.filter(
        (asset) =>
          asset.planLabel === firstMilestoneLabel ||
          (!firstMilestoneLabel && !asset.planLabel),
      ),
    );
    const selection = toAssetSelection(
      feedsForFirstMilestone[0] ?? milestoneFeeds[0]!,
      "approved_asset",
      "Artwork ready",
    );
    if (selection) {
      return selection;
    }
  }

  const fallback = sortVisualAssets(approvedAssets)[0];
  return fallback
    ? toAssetSelection(fallback, "approved_asset", "Artwork ready")
    : null;
}

function pickMostRecentUploadedAsset(
  assets: EventAsset[],
): HeroArtworkSelection | null {
  const recentAsset = sortVisualAssets(
    assets.filter(
      (asset) =>
        HERO_ASSET_TYPES.has(asset.assetType) && isUsableAsset(asset),
    ),
  )[0];

  if (!recentAsset) {
    return null;
  }

  return toAssetSelection(
    recentAsset,
    "uploaded_asset",
    "Latest event artwork",
  );
}

function pickCommunicationArtwork(
  communications: CommunicationItem[],
): HeroArtworkSelection | null {
  const visualCommunications = communications
    .filter((communication) =>
      VISUAL_COMMUNICATION_CHANNELS.has(communication.channel),
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  for (const communication of visualCommunications) {
    if (communication.channel === "instagram") {
      continue;
    }

    const imageUrl = extractImageUrl(communication.latestContent);
    if (!imageUrl) {
      continue;
    }

    return {
      source: "communication_artwork",
      caption: "Latest event artwork",
      imageUrl,
      label: communication.channel.replaceAll("_", " "),
      filename: null,
      aspectRatio: "square",
      assetType: getAssetTypeForChannel(communication.channel),
    };
  }

  return null;
}

export function selectHeroArtwork(input: {
  assets: EventAsset[];
  communications: CommunicationItem[];
  approvalRequests: ApprovalRequest[];
  approvedSquareImageUrl?: string | null;
}): HeroArtworkSelection | null {
  const approvedPlanArtwork = pickApprovedPlanAsset(input.assets);

  // Promoted hero (Create with AI first-milestone sync) wins over the planning
  // hub approved-square column, which otherwise stays stale after regeneration.
  if (approvedPlanArtwork?.assetType === "hero_image") {
    return approvedPlanArtwork;
  }

  if (input.approvedSquareImageUrl) {
    return {
      source: "approved_asset",
      caption: "Artwork ready",
      imageUrl: input.approvedSquareImageUrl,
      label: "Approved artwork",
      filename: null,
      aspectRatio: "square",
      assetType: "square_graphic",
    };
  }

  if (approvedPlanArtwork) {
    return approvedPlanArtwork;
  }

  const approvedCommunicationIds = getApprovedCommunicationIds(
    input.communications,
    input.approvalRequests,
  );

  const approvedArtwork = pickApprovedUploadedAsset(
    input.assets,
    input.communications,
    approvedCommunicationIds,
  );
  if (approvedArtwork) {
    return approvedArtwork;
  }

  const recentUpload = pickMostRecentUploadedAsset(input.assets);
  if (recentUpload) {
    return recentUpload;
  }

  return pickCommunicationArtwork(input.communications);
}
