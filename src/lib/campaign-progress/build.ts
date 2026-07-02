import { calculateCommunicationHealth } from "@/lib/playbooks/health";
import type { CampaignActionVerb } from "@/lib/campaign-intelligence/types";
import type { CampaignIntelligence } from "@/lib/campaign-intelligence/types";
import type {
  ApprovalRequest,
  CommunicationItem,
  EventAsset,
  PublicationScheduleItem,
} from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";
import type {
  CampaignProgressArtworkStatus,
  CampaignProgressNextAction,
  CampaignProgressSnapshot,
} from "@/lib/campaign-progress/types";

const VISUAL_ASSET_TYPES = new Set([
  "hero_image",
  "flyer",
  "square_graphic",
  "instagram_story",
]);

function estimateTimeForAction(verb: CampaignActionVerb): string {
  switch (verb) {
    case "Upload":
      return "~5 minutes";
    case "Review":
      return "<5 minutes";
    case "Draft":
    case "Schedule":
    case "Continue":
    case "Open":
    default:
      return "<2 minutes";
  }
}

function buildNextAction(
  intelligence: CampaignIntelligence,
): CampaignProgressNextAction | null {
  const action = intelligence.nextAction;
  if (!action) return null;

  return {
    title: `${action.verb} ${action.description}`,
    estimatedTime: estimateTimeForAction(action.verb),
    href: action.href,
  };
}

function countAwaitingApproval(
  communications: CommunicationItem[],
  approvalRequests: ApprovalRequest[],
): number {
  const pendingItemIds = new Set(
    approvalRequests
      .filter((request) => request.status === "pending")
      .map((request) => request.communicationItemId)
      .filter((id): id is string => Boolean(id)),
  );

  const itemIds = new Set<string>();
  for (const item of communications) {
    if (item.status === "pending_approval" || pendingItemIds.has(item.id)) {
      itemIds.add(item.id);
    }
  }

  return itemIds.size;
}

function resolveArtworkStatus(assets: EventAsset[]): {
  status: CampaignProgressArtworkStatus;
  label: string;
} {
  const visualAssets = assets.filter((asset) =>
    VISUAL_ASSET_TYPES.has(asset.assetType),
  );

  if (visualAssets.length === 0) {
    return { status: "needed", label: "Needed" };
  }

  const uploaded = visualAssets.filter(
    (asset) =>
      asset.status === "uploaded" &&
      Boolean(asset.filename || asset.storagePath),
  );

  if (uploaded.length >= visualAssets.length) {
    return { status: "complete", label: "Complete" };
  }

  if (uploaded.length > 0) {
    return { status: "in_progress", label: "In progress" };
  }

  return { status: "needed", label: "Needed" };
}

function resolveLastUpdated(
  communications: CommunicationItem[],
  assets: EventAsset[],
  publicationSchedule: PublicationScheduleItem[],
  eventUpdatedAt: string,
): { at: string | null; label: string } {
  const timestamps = [
    eventUpdatedAt,
    ...communications.map((item) => item.lastUpdated),
    ...assets.map((asset) => asset.updatedAt),
    ...publicationSchedule.map((item) => item.updatedAt),
  ].filter(Boolean);

  if (timestamps.length === 0) {
    return { at: null, label: "No recent updates" };
  }

  const latest = timestamps.sort((left, right) => right.localeCompare(left))[0]!;

  return {
    at: latest,
    label: formatRelativeTimestamp(latest),
  };
}

function formatRelativeTimestamp(isoTimestamp: string): string {
  const updated = new Date(isoTimestamp);
  if (Number.isNaN(updated.getTime())) {
    return "Recently updated";
  }

  const diffMs = Date.now() - updated.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Updated just now";
  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Updated ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return `Updated ${updated.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export function buildCampaignProgress(input: {
  steps: EventCommunicationStep[];
  communications: CommunicationItem[];
  approvalRequests: ApprovalRequest[];
  publicationSchedule: PublicationScheduleItem[];
  assets: EventAsset[];
  intelligence: CampaignIntelligence;
  eventUpdatedAt: string;
}): CampaignProgressSnapshot {
  const health = calculateCommunicationHealth(input.steps);
  const artwork = resolveArtworkStatus(input.assets);
  const lastUpdated = resolveLastUpdated(
    input.communications,
    input.assets,
    input.publicationSchedule,
    input.eventUpdatedAt,
  );

  const scheduled = input.publicationSchedule.filter(
    (item) => item.status === "scheduled",
  ).length;

  const publishedFromSchedule = input.publicationSchedule.filter(
    (item) => item.status === "published",
  ).length;

  const publishedFromComms = input.communications.filter(
    (item) => item.isPublished || item.status === "published",
  ).length;

  return {
    completionPercent: input.intelligence.completionPercent,
    communicationsCompleted: health.completedRequired,
    communicationsTotal: health.totalRequired,
    awaitingApproval: countAwaitingApproval(
      input.communications,
      input.approvalRequests,
    ),
    scheduled,
    published: Math.max(publishedFromSchedule, publishedFromComms),
    artworkStatus: artwork.status,
    artworkLabel: artwork.label,
    lastUpdatedAt: lastUpdated.at,
    lastUpdatedLabel: lastUpdated.label,
    nextAction: buildNextAction(input.intelligence),
  };
}
