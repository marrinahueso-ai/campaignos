import { markCommunicationPublished } from "@/lib/event-workspace/mutations";
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
import { createClient } from "@/lib/supabase/server";

export interface PublishMilestoneResult {
  success: boolean;
  error?: string | null;
  publishedCount: number;
  failedCount: number;
}

async function prepareSlotsForImmediatePublish(input: {
  eventId: string;
  relativeDay: number;
}): Promise<number> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("meta_publication_slots")
    .update({
      status: "approved",
      scheduled_for: now,
      updated_at: now,
    })
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .in("status", ["draft", "scheduled", "approved", "failed"])
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

  if (input.immediate) {
    const prepared = await prepareSlotsForImmediatePublish({
      eventId: input.eventId,
      relativeDay: input.relativeDay,
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

  if (!feedCaption || !storyCaption) {
    return {
      success: false,
      error: "Approved feed and story captions are required before auto-publish.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const { feedUrl, storyUrl } = await resolveMilestoneArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
  });

  if (!feedUrl || !storyUrl) {
    return {
      success: false,
      error: "Approved feed and story artwork are required before auto-publish.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  await markSlotsPosting(slots.map((slot) => slot.id));

  let publishedCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const slot of slots) {
    if (
      slot.platform === "instagram" &&
      !isInstagramPublishingConfigured(connection)
    ) {
      await updateSlotPublishResult({
        slotId: slot.id,
        status: "cancelled",
        publishError: "Skipped — Instagram is not connected.",
      });
      continue;
    }

    const result = await publishSlot({
      slot,
      connection: connection!,
      feedCaption,
      storyCaption,
      feedUrl,
      storyUrl,
    });

    if (result.error) {
      failedCount += 1;
      firstError ??= `${slotLabel(slot.platform, slot.placement)}: ${result.error}`;
      await updateSlotPublishResult({
        slotId: slot.id,
        status: "failed",
        publishError: result.error,
      });
      continue;
    }

    publishedCount += 1;
    await updateSlotPublishResult({
      slotId: slot.id,
      status: "published",
      externalPostId: result.postId,
    });
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
    (slot) => slot.relativeDay === input.relativeDay,
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
