import "server-only";

import { activateExternalArtworkOnAsset } from "@/lib/artwork-v2/activation";
import { maybePromoteApprovedArtworkToHero } from "@/lib/artwork-v2/hero";
import { campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  CampaignBuilderMilestone,
  MilestoneArtwork,
} from "@/lib/campaign-builder-v2/types";
import { ensurePlanAssetRow } from "@/lib/creative-director/mutations";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import {
  EVENT_ASSETS_BUCKET,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";

function publicUrlToStoragePath(publicUrl: string): string | null {
  const trimmed = publicUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed.replace(/^\/+/, "").split("?")[0] ?? null;
  }

  const publicMarker = `/object/public/${EVENT_ASSETS_BUCKET}/`;
  const publicIndex = trimmed.indexOf(publicMarker);
  if (publicIndex >= 0) {
    return trimmed.slice(publicIndex + publicMarker.length).split("?")[0] ?? null;
  }

  const bucketMarker = `${EVENT_ASSETS_BUCKET}/`;
  const bucketIndex = trimmed.indexOf(bucketMarker);
  if (bucketIndex >= 0) {
    return trimmed.slice(bucketIndex + bucketMarker.length).split("?")[0] ?? null;
  }

  return null;
}

function buildFeedPlanLabel(milestoneName: string): string {
  return `${milestoneName} — Feed 1:1`;
}

/**
 * Writes the first milestone's 1:1 feed artwork into event_assets so campaign
 * cards, planning hub, and overview hero tiles pick it up via selectHeroArtwork.
 * Promotes feed artwork to hero_image, replacing a prior hero when campaign builder regen runs.
 */
export async function syncCampaignBuilderHeroArtwork(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  artworkByMilestoneId: Map<string, MilestoneArtwork>;
}): Promise<void> {
  const sortedMilestones = [...input.milestones].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  for (const milestone of sortedMilestones) {
    const artwork = input.artworkByMilestoneId.get(milestone.id);
    const feedUrl = artwork?.feedUrl;
    if (!feedUrl || isPlaceholderArtworkUrl(feedUrl)) {
      continue;
    }

    const storagePath = publicUrlToStoragePath(feedUrl);
    if (!storagePath) {
      continue;
    }

    const planLabel = buildFeedPlanLabel(milestone.name);
    const assetId = await ensurePlanAssetRow(
      input.eventId,
      "square_graphic",
      planLabel,
    );
    if (!assetId) {
      continue;
    }

    const role = await getCurrentCampaignRole();
    const uploadedBy = campaignRoleLabel(role);
    const filename = sanitizeEventAssetFilename(`${milestone.name}-feed.png`);
    const generationPrompt = `Campaign Builder V2 — ${milestone.name}`;

    const activated = await activateExternalArtworkOnAsset({
      eventId: input.eventId,
      assetId,
      storagePath,
      filename,
      uploadedBy,
      aiGenerated: true,
      generationPrompt,
    });

    if (!activated) {
      continue;
    }

    await maybePromoteApprovedArtworkToHero({
      eventId: input.eventId,
      assetType: "square_graphic",
      storagePath,
      filename,
      generationPrompt,
      uploadedBy,
      replaceExistingHero: true,
    });

    revalidateEventPaths(input.eventId);
    return;
  }
}

export async function syncHeroFromMilestoneArtwork(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  milestoneId: string;
  artwork: MilestoneArtwork;
}): Promise<void> {
  const firstMilestone = [...input.milestones].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )[0];

  if (!firstMilestone || firstMilestone.id !== input.milestoneId) {
    return;
  }

  const artworkByMilestoneId = new Map([[input.milestoneId, input.artwork]]);
  await syncCampaignBuilderHeroArtwork({
    eventId: input.eventId,
    milestones: input.milestones,
    artworkByMilestoneId,
  });
}

export async function syncHeroFromAllMilestoneArtwork(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  results: Array<{ milestoneId: string; artwork: MilestoneArtwork }>;
}): Promise<void> {
  const artworkByMilestoneId = new Map(
    input.results.map((entry) => [entry.milestoneId, entry.artwork]),
  );

  await syncCampaignBuilderHeroArtwork({
    eventId: input.eventId,
    milestones: input.milestones,
    artworkByMilestoneId,
  });
}
