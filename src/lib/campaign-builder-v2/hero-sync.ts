import "server-only";

import { activateExternalArtworkOnAsset } from "@/lib/artwork-v2/activation";
import { buildPhasePlanLabel } from "@/lib/artwork-v2/campaign-phases";
import { maybePromoteApprovedArtworkToHero } from "@/lib/artwork-v2/hero";
import { campaignRoleLabel } from "@/lib/auth/campaign-roles";
import { getCurrentCampaignRole } from "@/lib/auth/get-current-role";
import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import type {
  CampaignBuilderMilestone,
  MilestoneArtwork,
} from "@/lib/campaign-builder-v2/types";
import { ensurePlanAssetRow } from "@/lib/creative-director/mutations";
import { updateEventPlanningFields } from "@/lib/event-playbooks/planning-mutations";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import {
  EVENT_ASSETS_BUCKET,
  sanitizeEventAssetFilename,
} from "@/lib/event-workspace/storage";
import { syncMetaPublicationSlots } from "@/lib/meta-publishing/sync-slots";
import { createClient } from "@/lib/supabase/server";
import type { EventAssetType } from "@/types/event-workspace";

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

/** Legacy label used by older campaign-builder syncs. */
function buildLegacyFeedPlanLabel(milestoneName: string): string {
  return `${milestoneName} — Feed 1:1`;
}

async function activateArtworkSurface(input: {
  eventId: string;
  milestoneName: string;
  assetType: EventAssetType;
  planLabel: string;
  publicUrl: string;
  surface: "feed" | "story";
  uploadedBy: string | null;
}): Promise<string | null> {
  if (isPlaceholderArtworkUrl(input.publicUrl)) {
    return null;
  }

  const storagePath = publicUrlToStoragePath(input.publicUrl);
  if (!storagePath) {
    return null;
  }

  const assetId = await ensurePlanAssetRow(
    input.eventId,
    input.assetType,
    input.planLabel,
  );
  if (!assetId) {
    return null;
  }

  const filename = sanitizeEventAssetFilename(
    `${input.milestoneName}-${input.surface}.png`,
  );
  const generationPrompt = `Campaign Builder V2 — ${input.milestoneName} (${input.surface})`;

  const activated = await activateExternalArtworkOnAsset({
    eventId: input.eventId,
    assetId,
    storagePath,
    filename,
    uploadedBy: input.uploadedBy,
    aiGenerated: true,
    generationPrompt,
  });

  return activated ? storagePath : null;
}

async function updateApprovalArtworkUrls(input: {
  eventId: string;
  milestoneId: string;
  artwork: MilestoneArtwork;
}): Promise<void> {
  const supabase = await createClient();
  const feedUrl = input.artwork.feedUrl?.trim() || null;
  const storyUrl = input.artwork.storyUrl?.trim() || null;

  if (!feedUrl && !storyUrl) {
    return;
  }

  await supabase
    .from("approval_scheduling_items")
    .update({
      feed_artwork_url: feedUrl,
      story_artwork_url: storyUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", input.eventId)
    .eq("campaign_milestone_id", input.milestoneId);
}

/**
 * Writes a milestone's feed + story artwork into event_assets (phase-aligned labels)
 * so Creative Studio, Meta slots, planning hub, and event hero can resolve them.
 */
export async function syncCampaignBuilderMilestoneArtwork(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  milestoneId: string;
  artwork: MilestoneArtwork;
  options?: {
    /** Default true. Set false while the builder is open to avoid remount churn. */
    revalidate?: boolean;
  };
}): Promise<void> {
  const milestone = input.milestones.find(
    (entry) => entry.id === input.milestoneId,
  );
  if (!milestone) {
    return;
  }

  const role = await getCurrentCampaignRole();
  const uploadedBy = campaignRoleLabel(role);
  const firstMilestone = [...input.milestones].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )[0];
  const isFirstMilestone = firstMilestone?.id === milestone.id;

  const feedUrl = input.artwork.feedUrl?.trim() || null;
  const storyUrl = input.artwork.storyUrl?.trim() || null;

  let feedStoragePath: string | null = null;

  if (feedUrl) {
    const phaseLabel = buildPhasePlanLabel(milestone.name, "Feed (1:1)");
    feedStoragePath = await activateArtworkSurface({
      eventId: input.eventId,
      milestoneName: milestone.name,
      assetType: "instagram_graphic",
      planLabel: phaseLabel,
      publicUrl: feedUrl,
      surface: "feed",
      uploadedBy,
    });

    // Keep legacy square_graphic row in sync for older hero/card selectors.
    await activateArtworkSurface({
      eventId: input.eventId,
      milestoneName: milestone.name,
      assetType: "square_graphic",
      planLabel: buildLegacyFeedPlanLabel(milestone.name),
      publicUrl: feedUrl,
      surface: "feed",
      uploadedBy,
    });
  }

  if (storyUrl) {
    await activateArtworkSurface({
      eventId: input.eventId,
      milestoneName: milestone.name,
      assetType: "instagram_story",
      planLabel: buildPhasePlanLabel(milestone.name, "Story"),
      publicUrl: storyUrl,
      surface: "story",
      uploadedBy,
    });
  }

  if (isFirstMilestone && feedStoragePath && feedUrl) {
    await maybePromoteApprovedArtworkToHero({
      eventId: input.eventId,
      assetType: "instagram_graphic",
      storagePath: feedStoragePath,
      filename: sanitizeEventAssetFilename(`${milestone.name}-feed.png`),
      generationPrompt: `Campaign Builder V2 — ${milestone.name}`,
      uploadedBy,
      replaceExistingHero: true,
    });

    // Campaign at a Glance + settings "approved square" read this column first.
    // Without updating it, Create with AI leaves the old glance/upcoming thumbnail.
    await updateEventPlanningFields(input.eventId, {
      approved_square_image_url: feedUrl,
      approved_square_image_status: "filled",
    });
  }

  await updateApprovalArtworkUrls({
    eventId: input.eventId,
    milestoneId: milestone.id,
    artwork: input.artwork,
  });

  try {
    await syncMetaPublicationSlots(input.eventId);
  } catch (error) {
    console.error("Failed to sync Meta publication slots after artwork:", error);
  }

  if (input.options?.revalidate !== false) {
    revalidateEventPaths(input.eventId);
  }
}

/** @deprecated Prefer syncCampaignBuilderMilestoneArtwork — kept for callers. */
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
    if (!artwork) {
      continue;
    }
    if (
      (!artwork.feedUrl || isPlaceholderArtworkUrl(artwork.feedUrl)) &&
      (!artwork.storyUrl || isPlaceholderArtworkUrl(artwork.storyUrl))
    ) {
      continue;
    }

    await syncCampaignBuilderMilestoneArtwork({
      eventId: input.eventId,
      milestones: input.milestones,
      milestoneId: milestone.id,
      artwork,
      options: { revalidate: false },
    });
  }

  revalidateEventPaths(input.eventId);
}

export async function syncHeroFromMilestoneArtwork(input: {
  eventId: string;
  milestones: CampaignBuilderMilestone[];
  milestoneId: string;
  artwork: MilestoneArtwork;
  options?: { revalidate?: boolean };
}): Promise<void> {
  await syncCampaignBuilderMilestoneArtwork(input);
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
