import {
  META_SOCIAL_CHANNELS,
  resolveArtworkMilestonesForEvent,
} from "@/lib/campaign-plan/resolve-plan-milestones";
import {
  buildArtworkPhaseItemsFromMilestones,
  groupArtworkPhasesByMilestone,
  isApprovedArtworkAsset,
  META_PUBLISH_TARGETS,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
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
  MetaPublishTargetPreview,
} from "@/lib/meta-publishing/types";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { createClient } from "@/lib/supabase/server";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";

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
  hasFeedArtwork: boolean;
  hasStoryArtwork: boolean;
  hasCaption: boolean;
  slotStatuses: MetaPublicationSlotStatus[];
}): MetaPublishBundleStatus {
  const { slotStatuses: statuses } = input;

  if (statuses.length > 0 && statuses.every((status) => status === "cancelled")) {
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

  if (!input.hasFeedArtwork || !input.hasStoryArtwork) {
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
function milestonesForScheduleDisplay(
  steps: EventCommunicationStepRow[],
): { relativeDay: number; title: string }[] {
  const byDay = new Map<number, string>();

  for (const step of [...steps].sort(
    (left, right) =>
      left.relative_day - right.relative_day || left.sort_order - right.sort_order,
  )) {
    if (!byDay.has(step.relative_day)) {
      byDay.set(step.relative_day, step.title);
    }
  }

  return Array.from(byDay.entries())
    .sort(([leftDay], [rightDay]) => leftDay - rightDay)
    .map(([relativeDay, title]) => ({ relativeDay, title }));
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
          .select("id, relative_day, due_date, title, channel, status, sort_order")
          .eq("event_id", eventId),
      ),
  ]);

  const steps = (stepsResult.data ?? []) as EventCommunicationStepRow[];

  const planMilestones =
    steps.length > 0
      ? milestonesForScheduleDisplay(steps)
      : await resolveArtworkMilestonesForEvent(eventId);

  if (planMilestones.length === 0) {
    return [];
  }

  const phaseItems = buildArtworkPhaseItemsFromMilestones(planMilestones);
  const milestoneGroups = groupArtworkPhasesByMilestone(phaseItems);

  const targets: MetaPublishTargetPreview[] = META_PUBLISH_TARGETS.map((target) => ({
    platform: target.platform,
    placement: target.placement,
    label: targetLabel(target.platform, target.placement),
  }));

  return milestoneGroups.map((group) => {
    const step = steps.find((entry) => entry.relative_day === group.relativeDay);
    const stepId = step?.id ?? null;
    const stepSkipped = step?.status === "skipped";
    const channel = (step?.channel as CommunicationChannel | undefined) ?? null;
    const isMetaPost = isMetaSocialChannel(channel);

    const feedPhase = group.formats.find((format) => format.metaPlacement === "feed");
    const storyPhase = group.formats.find((format) => format.metaPlacement === "story");
    const feedAsset = feedPhase ? resolveWorkflowAsset(feedPhase, null, assets) : null;
    const storyAsset = storyPhase ? resolveWorkflowAsset(storyPhase, null, assets) : null;

    const hasFeedArtwork = isApprovedArtworkAsset(feedAsset);
    const hasStoryArtwork = isApprovedArtworkAsset(storyAsset);
    const missingArtwork: string[] = [];

    if (!hasFeedArtwork) {
      missingArtwork.push("Feed (1:1)");
    }
    if (!hasStoryArtwork) {
      missingArtwork.push("Story");
    }

    const dueDate = (step?.due_date as string | undefined) ?? null;
    const scheduledFor =
      dueDate != null ? `${String(dueDate).slice(0, 10)}T10:00:00.000Z` : null;

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
      };
    }

    const groupSlots = slots.filter((slot) => slot.relativeDay === group.relativeDay);
    const feedCaption = getFeedCaptionForMilestone(metaCaptions, group.relativeDay);
    const storyCaption = getStoryCaptionForMilestone(metaCaptions, group.relativeDay);
    const captionPreview = feedCaption?.trim().slice(0, 160) ?? null;
    const metaScheduledFor =
      groupSlots.find((slot) => slot.scheduledFor)?.scheduledFor ?? scheduledFor;

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
            hasFeedArtwork,
            hasStoryArtwork,
            hasCaption: isMilestoneCaptionsApproved(metaCaptions, group.relativeDay),
            slotStatuses: slotStatuses(groupSlots),
          }),
      targets,
      missingArtwork,
      channel,
      isMetaPost: true,
      stepId,
    };
  });
}

export function countBundlesByStatus(
  bundles: MetaPublishBundle[],
  statuses: MetaPublishBundleStatus[],
): number {
  return bundles.filter((bundle) => statuses.includes(bundle.status)).length;
}
