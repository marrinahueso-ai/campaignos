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
  getMetaConnectionForEvent,
} from "@/lib/meta-publishing/connection";
import { ensureMetaConnectionHealthyForOrganization } from "@/lib/meta-publishing/connection-token-health";
import {
  isInstagramPublishingConfigured,
  isMetaConnectionConfigured,
} from "@/lib/meta-publishing/connection-utils";
import {
  publishFacebookFeedPhoto,
  publishFacebookPhotoStory,
  publishInstagramImage,
} from "@/lib/meta-publishing/graph-api";
import { clearNativeMetaSchedulesForSlots } from "@/lib/meta-publishing/native-schedule";
import { shouldSkipCampignOsCronPublish } from "@/lib/meta-publishing/native-schedule-utils";
import { getMetaPublicationSlotsForEvent } from "@/lib/meta-publishing/sync-slots";
import type {
  MetaConnection,
  MetaPublicationSlot,
  MetaPublishPlatform,
  MetaPublishPlacement,
} from "@/lib/meta-publishing/types";
import { markCommunicationPublished } from "@/lib/event-workspace/mutations";
import type { MetaPublishSurfaces } from "@/types/playbooks";
import { createJobClient } from "@/lib/supabase/job-client";

export interface PublishMilestoneResult {
  success: boolean;
  error?: string | null;
  publishedCount: number;
  failedCount: number;
}

async function getMilestonePublishSettings(
  eventId: string,
  relativeDay: number,
  useServiceRole: boolean,
): Promise<{ surfaces: MetaPublishSurfaces; storyManualPublish: boolean }> {
  const supabase = await createJobClient(useServiceRole);
  const { data: step } = await supabase
    .from("event_communication_steps")
    .select("meta_publish_surfaces, story_manual_publish")
    .eq("event_id", eventId)
    .eq("relative_day", relativeDay)
    .maybeSingle();

  return {
    surfaces: (step?.meta_publish_surfaces as MetaPublishSurfaces | undefined) ?? "both",
    storyManualPublish: Boolean(step?.story_manual_publish),
  };
}

function slotMatchesSurfaces(
  slot: MetaPublicationSlot,
  surfaces: MetaPublishSurfaces,
  storyManualPublish: boolean,
): boolean {
  return filterMetaPublishTargetsBySurfaces(surfaces, storyManualPublish).some(
    (target) => target.platform === slot.platform && target.placement === slot.placement,
  );
}

async function prepareSlotsForImmediatePublish(input: {
  eventId: string;
  relativeDay: number;
  surfaces: MetaPublishSurfaces;
  storyManualPublish: boolean;
  useServiceRole: boolean;
}): Promise<number> {
  const supabase = await createJobClient(input.useServiceRole);
  const now = new Date().toISOString();

  const enabledTargets = filterMetaPublishTargetsBySurfaces(
    input.surfaces,
    input.storyManualPublish,
  );

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
  useServiceRole: boolean;
}): Promise<void> {
  const supabase = await createJobClient(input.useServiceRole);
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

async function markSlotsPosting(
  slotIds: string[],
  useServiceRole: boolean,
): Promise<void> {
  if (slotIds.length === 0) {
    return;
  }

  const supabase = await createJobClient(useServiceRole);
  await supabase
    .from("meta_publication_slots")
    .update({ status: "posting", updated_at: new Date().toISOString() })
    .in("id", slotIds);
}

async function markDueSlotsFailed(input: {
  eventId: string;
  relativeDay: number;
  publishError: string;
  useServiceRole: boolean;
}): Promise<void> {
  const supabase = await createJobClient(input.useServiceRole);
  const now = new Date().toISOString();

  await supabase
    .from("meta_publication_slots")
    .update({
      status: "failed",
      publish_error: input.publishError,
      updated_at: now,
    })
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .eq("status", "approved")
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now);
}

export async function publishMetaMilestoneBundle(input: {
  eventId: string;
  relativeDay: number;
  connection?: MetaConnection | null;
  /** When true, bypasses scheduled time and publishes via Graph API now. */
  immediate?: boolean;
  /** Cron / job path: service-role DB + event→org Meta connection (no user session). */
  useServiceRole?: boolean;
}): Promise<PublishMilestoneResult> {
  const useServiceRole = Boolean(input.useServiceRole);

  const connection =
    input.connection ??
    (useServiceRole
      ? await getMetaConnectionForEvent(input.eventId, { useServiceRole: true })
      : await getMetaConnectionForCurrentOrg());

  if (!connection || !isMetaConnectionConfigured(connection)) {
    const error =
      "Meta is not connected. Add your Facebook Page and Instagram account in Settings → Meta Publishing.";
    if (useServiceRole && !input.immediate) {
      await markDueSlotsFailed({
        eventId: input.eventId,
        relativeDay: input.relativeDay,
        publishError: error,
        useServiceRole: true,
      });
    }
    return {
      success: false,
      error,
      publishedCount: 0,
      failedCount: 0,
    };
  }

  if (connection.organizationId && connection.id !== "env") {
    const health = await ensureMetaConnectionHealthyForOrganization(
      connection.organizationId,
    );
    if (health && !health.tokenValid) {
      const error =
        "Meta connection expired or was revoked. Reconnect once in Settings → Meta Publishing.";
      if (useServiceRole && !input.immediate) {
        await markDueSlotsFailed({
          eventId: input.eventId,
          relativeDay: input.relativeDay,
          publishError: error,
          useServiceRole: true,
        });
      }
      return {
        success: false,
        error,
        publishedCount: 0,
        failedCount: 0,
      };
    }
  }

  const { surfaces, storyManualPublish } = await getMilestonePublishSettings(
    input.eventId,
    input.relativeDay,
    useServiceRole,
  );

  if (input.immediate) {
    const prepared = await prepareSlotsForImmediatePublish({
      eventId: input.eventId,
      relativeDay: input.relativeDay,
      surfaces,
      storyManualPublish,
      useServiceRole,
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

  const allEligibleSlots = (
    await getMetaPublicationSlotsForEvent(input.eventId, { useServiceRole })
  ).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay &&
      slotMatchesSurfaces(slot, surfaces, storyManualPublish) &&
      (slot.status === "approved" || slot.status === "failed"),
  );

  // Meta-native scheduled posts: Meta publishes them. After due time, mark
  // published in CampignOS without calling Graph publish again.
  if (!input.immediate) {
    const dueNative = allEligibleSlots.filter(
      (slot) =>
        shouldSkipCampignOsCronPublish(slot) &&
        slot.scheduledFor &&
        new Date(slot.scheduledFor).getTime() <= Date.now(),
    );
    await Promise.all(
      dueNative.map((slot) =>
        updateSlotPublishResult({
          slotId: slot.id,
          status: "published",
          externalPostId: slot.graphScheduleId,
          publishError: null,
          useServiceRole,
        }),
      ),
    );
  }

  let slots = input.immediate
    ? allEligibleSlots
    : allEligibleSlots.filter((slot) => !shouldSkipCampignOsCronPublish(slot));

  if (input.immediate && slots.some((slot) => slot.graphScheduleId)) {
    await clearNativeMetaSchedulesForSlots({
      slots: slots.filter((slot) => Boolean(slot.graphScheduleId)),
      connection,
    });
    slots = slots.map((slot) =>
      slot.graphScheduleId ? { ...slot, graphScheduleId: null } : slot,
    );
  }

  if (slots.length === 0) {
    const nativeDueCount = !input.immediate
      ? allEligibleSlots.filter(
          (slot) =>
            shouldSkipCampignOsCronPublish(slot) &&
            slot.scheduledFor &&
            new Date(slot.scheduledFor).getTime() <= Date.now(),
        ).length
      : 0;

    if (nativeDueCount > 0) {
      return {
        success: true,
        error: null,
        publishedCount: nativeDueCount,
        failedCount: 0,
      };
    }

    return {
      success: false,
      error: input.immediate
        ? "Could not prepare posts for immediate publish."
        : "No approved posts found for this milestone.",
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const captions = await getMetaSocialCaptionsForEvent(input.eventId, {
    useServiceRole,
  });
  const feedCaption = getFeedCaptionForMilestone(captions, input.relativeDay)?.trim();
  const storyCaption = getStoryCaptionForMilestone(captions, input.relativeDay)?.trim();

  const needsFeedCaption = isFeedSurfaceEnabled(surfaces);
  const needsStoryCaption =
    isStorySurfaceEnabled(surfaces) && !storyManualPublish;

  if (
    (needsFeedCaption && !feedCaption) ||
    (needsStoryCaption && !storyCaption)
  ) {
    const error =
      needsFeedCaption && needsStoryCaption
        ? "Approved feed and story captions are required before auto-publish."
        : needsFeedCaption
          ? "Approved feed caption is required before auto-publish."
          : "Approved story caption is required before auto-publish.";
    if (useServiceRole && !input.immediate) {
      await markDueSlotsFailed({
        eventId: input.eventId,
        relativeDay: input.relativeDay,
        publishError: error,
        useServiceRole: true,
      });
    }
    return {
      success: false,
      error,
      publishedCount: 0,
      failedCount: 0,
    };
  }

  const { feedUrl, storyUrl } = await resolveMilestoneArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    useServiceRole,
  });

  if (
    (needsFeedCaption && !feedUrl) ||
    (needsStoryCaption && !storyUrl)
  ) {
    const error =
      needsFeedCaption && needsStoryCaption
        ? "Approved feed and story artwork are required before auto-publish."
        : needsFeedCaption
          ? "Approved feed artwork is required before auto-publish."
          : "Approved story artwork is required before auto-publish.";
    if (useServiceRole && !input.immediate) {
      await markDueSlotsFailed({
        eventId: input.eventId,
        relativeDay: input.relativeDay,
        publishError: error,
        useServiceRole: true,
      });
    }
    return {
      success: false,
      error,
      publishedCount: 0,
      failedCount: 0,
    };
  }

  await markSlotsPosting(
    slots.map((slot) => slot.id),
    useServiceRole,
  );

  const publishInputs = {
    connection,
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
        useServiceRole,
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
    await markCommunicationPublished(communicationItemId, { useServiceRole });
  }

  if (publishedCount > 0) {
    const supabase = await createJobClient(useServiceRole);
    await supabase.from("activity_log").insert({
      event_id: input.eventId,
      activity_type: "published",
      title: "Meta posts published",
      description: `Auto-published ${publishedCount} post(s) for milestone day ${input.relativeDay}.`,
      occurred_at: new Date().toISOString(),
    });
  }

  const allDaySlots = (
    await getMetaPublicationSlotsForEvent(input.eventId, { useServiceRole })
  ).filter(
    (slot) =>
      slot.relativeDay === input.relativeDay &&
      slotMatchesSurfaces(slot, surfaces, storyManualPublish),
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

  if (failedCount > 0) {
    const { reportFailedAction } = await import("@/lib/monitoring/report-error");
    reportFailedAction("meta", {
      action: "publishMetaMilestoneBundle",
      eventId: input.eventId,
      organizationId: connection.organizationId,
      message: firstError ?? "Some posts failed to publish.",
      statusCode: null,
    });
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
