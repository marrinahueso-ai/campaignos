import {
  isStoryMilestoneDistinctlyApproved,
  resolveMilestonePhaseAsset,
} from "@/lib/artwork-v2/milestone-assets";
import {
  META_SOCIAL_CHANNELS,
  findCommunicationStepForRelativeDay,
  metaWorkflowMilestonesFromStepRows,
  resolveSocialMetaMilestonesForEvent,
} from "@/lib/campaign-plan/resolve-plan-milestones";
import {
  planDueDateToScheduledTime,
  resolveBundleScheduledFor,
} from "@/lib/campaign-plan/plan-milestone-display";
import {
  buildArtworkPhaseItemsFromMilestones,
  filterMetaPublishTargetsBySurfaces,
  groupArtworkPhasesByMilestone,
  isApprovedArtworkAsset,
  isFeedSurfaceEnabled,
  isStoryAutoPublishEnabled,
  isStorySurfaceEnabled,
} from "@/lib/artwork-v2/campaign-phases";
import {
  getFeedCaptionForMilestone,
  getMetaSocialCaptionsForEvent,
  getStoryCaptionForMilestone,
  isMilestoneCaptionsApproved,
} from "@/lib/meta-captions/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import {
  ensureMetaPublicationSlots,
  getMetaPublicationSlotsForEvent,
} from "@/lib/meta-publishing/sync-slots";
import type {
  MetaPublicationSlot,
  MetaPublicationSlotStatus,
  MetaPublishBundle,
  MetaPublishBundleStatus,
} from "@/lib/meta-publishing/types";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { createClient } from "@/lib/supabase/server";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";
import {
  derivePublishMode,
  isManualStoryOnlyBundle,
} from "@/lib/meta-publishing/publish-mode";
import type { MetaPublishSurfaces } from "@/types/playbooks";

function targetLabel(platform: string, placement: string): string {
  const platformLabel = platform === "facebook" ? "Facebook" : "Instagram";
  const placementLabel = placement === "feed" ? "Feed" : "Story";
  return `${platformLabel} ${placementLabel}`;
}

function slotStatuses(slots: MetaPublicationSlot[]): MetaPublicationSlotStatus[] {
  return slots.map((slot) => slot.status);
}

function isMetaSocialChannel(channel: CommunicationChannel | null | undefined): boolean {
  return Boolean(channel && META_SOCIAL_CHANNELS.includes(channel));
}

function deriveBundleStatus(input: {
  surfaces: MetaPublishSurfaces;
  storyManualPublish: boolean;
  storyReminderSentAt: string | null;
  stepCompleted: boolean;
  hasFeedArtwork: boolean;
  hasStoryArtwork: boolean;
  hasCaption: boolean;
  slotStatuses: MetaPublicationSlotStatus[];
}): MetaPublishBundleStatus {
  const { slotStatuses: statuses, surfaces, storyManualPublish, storyReminderSentAt, stepCompleted } =
    input;
  const needsFeedArtwork = isFeedSurfaceEnabled(surfaces);
  const needsStoryArtwork = isStorySurfaceEnabled(surfaces);

  if (statuses.length > 0 && statuses.every((status) => status === "cancelled")) {
    if (
      isManualStoryOnlyBundle(surfaces, storyManualPublish) &&
      input.hasStoryArtwork &&
      input.hasCaption
    ) {
      if (stepCompleted) {
        return "published";
      }
      if (storyReminderSentAt) {
        return "scheduled";
      }
      return "ready";
    }
    return "skipped";
  }

  if (statuses.some((status) => status === "failed")) {
    return "failed";
  }

  if (statuses.some((status) => status === "posting")) {
    return "posting";
  }

  const publishableStatuses = statuses.filter((status) => status !== "cancelled");
  if (
    publishableStatuses.length > 0 &&
    publishableStatuses.every((status) => status === "published")
  ) {
    return "published";
  }

  if (statuses.length > 0 && statuses.every((status) => status === "approved")) {
    return "approved";
  }

  if (statuses.length > 0 && statuses.every((status) => status === "scheduled")) {
    return "scheduled";
  }

  if (
    (needsFeedArtwork && !input.hasFeedArtwork) ||
    (needsStoryArtwork && !input.hasStoryArtwork)
  ) {
    return "needs_artwork";
  }

  if (!input.hasCaption) {
    return "needs_caption";
  }

  return "ready";
}

function deriveChannelOnlyStatus(input: {
  hasFeedArtwork: boolean;
  hasStoryArtwork: boolean;
}): MetaPublishBundleStatus {
  if (!input.hasFeedArtwork || !input.hasStoryArtwork) {
    return "needs_artwork";
  }

  return "channel_only";
}

/** All plan milestones for schedule UI — includes skipped steps so volunteers can restore them. */
function milestoneTitlesAtDay(
  steps: EventCommunicationStepRow[],
  relativeDay: number,
): string[] {
  const titles = steps
    .filter((step) => step.relative_day === relativeDay && step.status !== "skipped")
    .map((step) => step.title.trim())
    .filter(Boolean);

  return [...new Set(titles)];
}

export async function getMetaPublishBundles(eventId: string): Promise<MetaPublishBundle[]> {
  const event = await getEventById(eventId);
  if (!event) {
    return [];
  }

  await ensureMetaPublicationSlots(eventId);
  const slots = await getMetaPublicationSlotsForEvent(eventId);

  const [assets, metaCaptions, stepsResult] = await Promise.all([
    getCampaignAssetsForEvent(eventId),
    getMetaSocialCaptionsForEvent(eventId),
    createClient()
      .then((client) =>
        client
          .from("event_communication_steps")
          .select("id, relative_day, due_date, title, channel, status, sort_order, meta_publish_surfaces, story_manual_publish, story_reminder_sent_at")
          .eq("event_id", eventId)
          .order("sort_order", { ascending: true }),
      ),
  ]);

  const steps = (stepsResult.data ?? []) as EventCommunicationStepRow[];

  const planMilestones =
    steps.length > 0
      ? metaWorkflowMilestonesFromStepRows(steps)
      : await resolveSocialMetaMilestonesForEvent(eventId);

  if (planMilestones.length === 0) {
    return [];
  }

  const phaseItems = buildArtworkPhaseItemsFromMilestones(planMilestones);
  const milestoneGroups = groupArtworkPhasesByMilestone(phaseItems);

  return milestoneGroups.map((group) => {
    const step = findCommunicationStepForRelativeDay(steps, group.relativeDay, {
      preferMetaSocial: true,
    });
    const stepId = step?.id ?? null;
    const stepSkipped = step?.status === "skipped";
    const channel = (step?.channel as CommunicationChannel | undefined) ?? null;
    const isMetaPost = isMetaSocialChannel(channel);
    const metaPublishSurfaces =
      (step?.meta_publish_surfaces as MetaPublishSurfaces | undefined) ?? "both";
    const storyManualPublish = Boolean(step?.story_manual_publish);
    const storyReminderSentAt = (step?.story_reminder_sent_at as string | null | undefined) ?? null;
    const stepCompleted = step?.status === "completed";
    const publishMode = derivePublishMode(metaPublishSurfaces, storyManualPublish);
    const enabledTargets = filterMetaPublishTargetsBySurfaces(
      metaPublishSurfaces,
      storyManualPublish,
    ).map(
      (target) => ({
        platform: target.platform,
        placement: target.placement,
        label: targetLabel(target.platform, target.placement),
      }),
    );

    const feedPhase = group.formats.find((format) => format.metaPlacement === "feed");
    const storyPhase = group.formats.find((format) => format.metaPlacement === "story");
    const titlesAtDay = milestoneTitlesAtDay(steps, group.relativeDay);
    const feedAsset = feedPhase
      ? resolveMilestonePhaseAsset(feedPhase, assets, titlesAtDay)
      : null;
    const storyAsset = storyPhase
      ? resolveMilestonePhaseAsset(storyPhase, assets, titlesAtDay)
      : null;

    const hasFeedArtwork = isApprovedArtworkAsset(feedAsset);
    const hasStoryArtwork =
      storyPhase && feedPhase
        ? isStoryMilestoneDistinctlyApproved(feedPhase, storyPhase, assets, titlesAtDay)
        : isApprovedArtworkAsset(storyAsset);
    const missingArtwork: string[] = [];

    if (isFeedSurfaceEnabled(metaPublishSurfaces) && !hasFeedArtwork) {
      missingArtwork.push("Feed (1:1)");
    }
    if (
      isStoryAutoPublishEnabled(metaPublishSurfaces, storyManualPublish) &&
      !hasStoryArtwork
    ) {
      missingArtwork.push("Story");
    }

    const dueDate = (step?.due_date as string | undefined) ?? null;
    const scheduledFor = planDueDateToScheduledTime(dueDate);

    const feedArtworkUrl =
      hasFeedArtwork && feedAsset?.storagePath
        ? resolveAssetImageUrl(feedAsset.storagePath)
        : null;
    const storyArtworkUrl =
      hasStoryArtwork && storyAsset?.storagePath
        ? resolveAssetImageUrl(storyAsset.storagePath)
        : null;

    if (!isMetaPost) {
      return {
        relativeDay: group.relativeDay,
        title: group.title,
        dueDate,
        scheduledFor,
        captionPreview: null,
        storyCaptionPreview: null,
        feedArtworkUrl,
        storyArtworkUrl,
        status: stepSkipped
          ? "skipped"
          : deriveChannelOnlyStatus({ hasFeedArtwork, hasStoryArtwork }),
        targets: [],
        missingArtwork,
        channel,
        isMetaPost: false,
        stepId,
        metaPublishSurfaces,
        storyManualPublish,
        publishMode,
        storyReminderSentAt,
      };
    }

    const groupSlots = slots.filter((slot) => slot.relativeDay === group.relativeDay);
    const feedCaption = getFeedCaptionForMilestone(metaCaptions, group.relativeDay);
    const storyCaption = getStoryCaptionForMilestone(metaCaptions, group.relativeDay);
    const captionPreview = feedCaption?.trim().slice(0, 160) ?? null;
    const committedSlot = groupSlots.find(
      (slot) => slot.scheduledFor && ["scheduled", "approved", "posting", "published"].includes(slot.status),
    );
    const metaScheduledFor = resolveBundleScheduledFor({
      dueDate,
      slotScheduledFor: committedSlot?.scheduledFor,
      slotStatus: committedSlot?.status,
    });

    return {
      relativeDay: group.relativeDay,
      title: group.title,
      dueDate,
      scheduledFor: metaScheduledFor,
      captionPreview,
      storyCaptionPreview: storyCaption?.trim().slice(0, 120) ?? null,
      feedArtworkUrl,
      storyArtworkUrl,
      status: stepSkipped
        ? "skipped"
        : deriveBundleStatus({
            surfaces: metaPublishSurfaces,
            storyManualPublish,
            storyReminderSentAt,
            stepCompleted,
            hasFeedArtwork,
            hasStoryArtwork,
            hasCaption: isMilestoneCaptionsApproved(
              metaCaptions,
              group.relativeDay,
              metaPublishSurfaces,
            ),
            slotStatuses: slotStatuses(groupSlots),
          }),
      targets: enabledTargets,
      missingArtwork,
      channel,
      isMetaPost: true,
      stepId,
      metaPublishSurfaces,
      storyManualPublish,
      publishMode,
      storyReminderSentAt,
    };
  });
}

export function countBundlesByStatus(
  bundles: MetaPublishBundle[],
  statuses: MetaPublishBundleStatus[],
): number {
  return bundles.filter((bundle) => statuses.includes(bundle.status)).length;
}

export {
  bundleHasAutoPublishTargets,
  bundleIsManualStoryOnly,
  bundleIsSchedulable,
} from "@/lib/meta-publishing/bundle-display";
