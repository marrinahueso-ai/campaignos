import {
  filterMetaPublishTargetsBySurfaces,
  isFeedSurfaceEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveMilestoneArtworkUrls } from "@/lib/meta-publishing/resolve-milestone-artwork";
import {
  getFeedCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  getStoryCaptionForMilestone,
} from "@/lib/meta-captions/queries";
import {
  getMetaConnectionForCurrentOrg,
} from "@/lib/meta-publishing/connection";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import {
  publishFacebookFeedPhoto,
  publishFacebookPhotoStory,
  publishInstagramImage,
} from "@/lib/meta-publishing/graph-api";
import { getMetaPublicationSlotsForEvent } from "@/lib/meta-publishing/sync-slots";
import type {
  MetaConnection,
  MetaPublicationSlot,
  MetaPublishPlatform,
  MetaPublishPlacement,
} from "@/lib/meta-publishing/types";
import { markCommunicationPublished } from "@/lib/event-workspace/mutations";
import type { MetaPublishSurfaces } from "@/types/playbooks";
import { createClient } from "@/lib/supabase/server";

export interface PublishMilestoneResult {
  success: boolean;
  error?: string | null;
  publishedCount: number;
  failedCount: number;
}

async function getMilestonePublishSurfaces(
  eventId: string,
  relativeDay: number,
): Promise<MetaPublishSurfaces> {
  const supabase = await createClient();
  const { data: step } = await supabase
    .from("event_communication_steps")
    .select("meta_publish_surfaces")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  return (step?.meta_publish_surfaces as MetaPublishSurfaces | undefined) ?? "both";
}

function slotMatchesSurfaces(
  slot: MetaPublicationSlot,
  surfaces: MetaPublishSurfaces,
): boolean {
  return filterMetaPublishTargetsBySurfaces(surfaces).some(
    (target) => target.platform === slot.platform && target.placement === slot.placement,
  );
}

async function prepareSlotsForImmediatePublish(input: {
  eventId: string;
  relativeDay: number;
  surfaces: MetaPublishSurfaces;
}): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const enabledTargets = filterMetaPublishTargetsBySurfaces(input.surfaces);

  if (enabledTargets.length === 0) {
    return 0;
  }

  const { data: existingSlots, error: listError } = await supabase
    .from("meta_publication_slots")
    .select("id, platform, placement, status")
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .in("status", ["draft", "scheduled", "approved", "failed"]);

  if (listError) {
    console.error("Failed to list slots for immediate publish:", listError.message);
    return 0;
  }

  const slotIds = (existingSlots ?? [])
    .filter((slot) =>
      enabledTargets.some(
        (target) =>
          target.platform === slot.platform && target.placement === slot.placement,
      ),
    )
    .map((slot) => slot.id as string);

  if (slotIds.length === 0) {
    return 0;
  }

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .update({
      status: "approved",
      scheduled_for: now,
      updated_at: now,
    })
    .in("id", slotIds)
    .select("id");

  if (error) {
    console.error("Failed to prepare slots for immediate publish:", error.message);
    return 0;
  }

  return data?.length ?? 0;
}

async function publishSlot(input: {
  slot: MetaPublicationSlot;
  connection: MetaConnection;
  feedCaption: string;
  storyCaption: string;
  feedUrl: string;
  storyUrl: string;
}): Promise<{ postId: string | null; error: string | null }> {
  const { slot, connection } = input;
  const token = connection.pageAccessToken;

  if (slot.platform === "facebook" && slot.placement === "feed") {
    return publishFacebookFeedPhoto({
      pageId: connection.facebookPageId,
      accessToken: token,
      imageUrl: input.feedUrl,
      caption: input.feedCaption,
    });
  }

  if (slot.platform === "facebook" && slot.placement === "story") {
    return publishFacebookPhotoStory({
      pageId: connection.facebookPageId,
      accessToken: token,
      imageUrl: input.storyUrl,
    });
  }

  if (slot.platform === "instagram" && slot.placement === "feed") {
    return publishInstagramImage({
      instagramAccountId: connection.instagramAccountId,
      accessToken: token,
      imageUrl: input.feedUrl,
      caption: input.feedCaption,
      mediaType: "FEED",
    });
  }

  return publishInstagramImage({
    instagramAccountId: connection.instagramAccountId,
    accessToken: token,
    imageUrl: input.storyUrl,
    mediaType: "STORIES",
  });
}

async function updateSlotPublishResult(input: {
  slotId: string;
  status: "published" | "failed" | "cancelled";
  externalPostId?: string | null;
  publishError?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  await supabase
    .from("meta_publication_slots")
    .update({
      status: input.status,
      external_post_id: input.externalPostId ?? null,
      publish_error: input.publishError ?? null,
      published_at: input.status === "published" ? now : null,
      updated_at: now,
    })
    .eq("id", input.slotId);
}

async function markSlotsPosting(slotIds: string[]): Promise<void> {
  if (slotIds.length === 0) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("meta_publication_slots")
    .update({ status: "posting", updated_at: new Date().toISOString() })
    .in("id", slotIds);
}

export async function publishMetaMilestoneBundle(input: {
  eventId: string;
  relativeDay: number;
  connection?: MetaConnection | null;
  /** When true, bypasses scheduled time and publishes via Graph API now. */
  immediate?: boolean;
}): Promise<PublishMilestoneResult> {
  const connection = input.connection ?? (await getMetaConnectionForCurrentOrg());

  if (!isMetaConnectionConfigured(connection)) {
    return {
      success: false,
      error:
        "Meta is not connected. Add your Facebook Page and Instagram account in Settings → Meta Publishing.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const surfaces = await getMilestonePublishSurfaces(input.eventId, input.relativeDay);

  if (input.immediate) {
    const prepared = await prepareSlotsForImmediatePublish({
      eventId: input.eventId,
      relativeDay: input.relativeDay,
      surfaces,
    });

    if (prepared === 0) {
      return {
        success: false,
        error: "No publishable posts found for this milestone.",
        publishedCount: 0,
        failedCount: 0,
      };
    }
  }

  const slots = (await getMetaPublicationSlotsForEvent(input.eventId)).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay &&
      slotMatchesSurfaces(slot, surfaces) &&
      (slot.status === "approved" || slot.status === "failed"),
  );

  if (slots.length === 0) {
    return {
      success: false,
      error: input.immediate
        ? "Could not prepare posts for immediate publish."
        : "No approved posts found for this milestone.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId);
  const feedCaption = getFeedCaptionForMilestone(captions, input.relativeDay)?.trim();
  const storyCaption = getStoryCaptionForMilestone(captions, input.relativeDay)?.trim();

  const needsFeedCaption = isFeedSurfaceEnabled(surfaces);
  const needsStoryCaption = isStorySurfaceEnabled(surfaces);

  if (
    (needsFeedCaption && !feedCaption) ||
    (needsStoryCaption && !storyCaption)
  ) {
    return {
      success: false,
      error: needsFeedCaption && needsStoryCaption
        ? "Approved feed and story captions are required before auto-publish."
        : needsFeedCaption
          ? "Approved feed caption is required before auto-publish."
          : "Approved story caption is required before auto-publish.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const { feedUrl, storyUrl } = await resolveMilestoneArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
  });

  if (
    (needsFeedCaption && !feedUrl) ||
    (needsStoryCaption && !storyUrl)
  ) {
    return {
      success: false,
      error: needsFeedCaption && needsStoryCaption
        ? "Approved feed and story artwork are required before auto-publish."
        : needsFeedCaption
          ? "Approved feed artwork is required before auto-publish."
          : "Approved story artwork is required before auto-publish.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  await markSlotsPosting(slots.map((slot) => slot.id));

  const publishInputs = {
    connection: connection!,
    feedCaption: feedCaption ?? "",
    storyCaption: storyCaption ?? "",
    feedUrl: feedUrl ?? "",
    storyUrl: storyUrl ?? "",
  };

  const outcomes = await Promise.all(
    slots.map(async (slot) => {
      if (
        slot.platform === "instagram" &&
        !isInstagramPublishingConfigured(connection)
      ) {
        return {
          slot,
          status: "cancelled" as const,
          externalPostId: null,
          publishError: "Skipped — Instagram is not connected.",
        };
      }

      const result = await publishSlot({ slot, ...publishInputs });

      if (result.error) {
        return {
          slot,
          status: "failed" as const,
          externalPostId: null,
          publishError: result.error,
        };
      }

      return {
        slot,
        status: "published" as const,
        externalPostId: result.postId,
        publishError: null,
      };
    }),
  );

  await Promise.all(
    outcomes.map((outcome) =>
      updateSlotPublishResult({
        slotId: outcome.slot.id,
        status: outcome.status,
        externalPostId: outcome.externalPostId,
        publishError: outcome.publishError,
      }),
    ),
  );

  let publishedCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const outcome of outcomes) {
    if (outcome.status === "published") {
      publishedCount += 1;
      continue;
    }

    if (outcome.status === "failed") {
      failedCount += 1;
      firstError ??=
        `${slotLabel(outcome.slot.platform, outcome.slot.placement)}: ${outcome.publishError}`;
    }
  }

  const communicationItemId = slots.find((slot) => slot.communicationItemId)?.communicationItemId;
  if (publishedCount > 0 && communicationItemId) {
    await markCommunicationPublished(communicationItemId);
  }

  if (publishedCount > 0) {
    const supabase = await createClient();
    await supabase.from("activity_log").insert({
      event_id: input.eventId,
      activity_type: "published",
      title: "Meta posts published",
      description: `Auto-published ${publishedCount} post(s) for milestone day ${input.relativeDay}.`,
      occurred_at: new Date().toISOString(),
    });
  }

  const allDaySlots = (await getMetaPublicationSlotsForEvent(input.eventId)).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay && slotMatchesSurfaces(slot, surfaces),
  );
  const activeDaySlots = allDaySlots.filter((slot) => slot.status !== "cancelled");
  const alreadyPublished =
    publishedCount === 0 &&
    failedCount === 0 &&
    activeDaySlots.length > 0 &&
    activeDaySlots.every((slot) => slot.status === "published");

  if (alreadyPublished) {
    return {
      success: true,
      error: null,
      publishedCount: activeDaySlots.length,
      failedCount: 0,
    };
  }

  return {
    success: failedCount === 0 && publishedCount > 0,
    error:
      failedCount > 0
        ? (firstError ?? "Some posts failed to publish.")
        : publishedCount === 0
          ? "Nothing was published for this milestone."
          : null,
    publishedCount,
    failedCount,
  };
}

function slotLabel(platform: MetaPublishPlatform, placement: MetaPublishPlacement): string {
  const platformLabel = platform === "facebook" ? "Facebook" : "Instagram";
  const placementLabel = placement === "feed" ? "Feed" : "Story";
  return `${platformLabel} ${placementLabel}`;
}
