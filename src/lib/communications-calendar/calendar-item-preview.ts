import "server-only";

import { playbookRelativeDay } from "@/lib/campaign-builder-v2/campaign-timing";
import { milestoneNameMatchKey } from "@/lib/campaign-builder-v2/milestone-names";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import {
  indexCb2ArtworkRows,
  resolveCb2ArtworkForMilestone,
} from "@/lib/meta-publishing/cb2-artwork-identity";
import { getMetaPublishBundles } from "@/lib/meta-publishing/bundles";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils/dates";
import { getEventById } from "@/lib/events/queries";
import type { UnifiedApprovalPreview } from "@/lib/approvals-scheduling/types";

export type CalendarItemPreview = {
  preview: UnifiedApprovalPreview;
  scheduleLabel: string | null;
  platforms: string[];
  deliveryMethod: string | null;
};

function relativeDayFromSourceId(
  sourceId: string,
  eventId: string,
): number | null {
  const prefix = `${eventId}-`;
  if (!sourceId.startsWith(prefix)) {
    return null;
  }
  const day = Number(sourceId.slice(prefix.length));
  return Number.isFinite(day) ? day : null;
}

/**
 * Resolve artwork + captions for a calendar chip on open (lazy).
 * Prefers Create with AI approval rows by milestone ID, then Meta bundles.
 * Never returns another milestone's artwork via first-available name fallback.
 */
export async function loadCalendarItemPreview(input: {
  eventId: string;
  sourceId: string;
  milestoneTitle: string | null;
  scheduledAt?: string | null;
  campaignMilestoneId?: string | null;
}): Promise<CalendarItemPreview> {
  const empty: CalendarItemPreview = {
    preview: {
      captionText: null,
      storyCaptionSnippet: null,
      feedArtworkUrl: null,
      storyArtworkUrl: null,
    },
    scheduleLabel: input.scheduledAt ? formatDateTime(input.scheduledAt) : null,
    platforms: ["facebook", "instagram"],
    deliveryMethod: "auto-publish",
  };

  const relativeDay = relativeDayFromSourceId(input.sourceId, input.eventId);
  const supabase = await createClient();
  const [schedulingResult, session, event] = await Promise.all([
    supabase
      .from("approval_scheduling_items")
      .select(
        "campaign_milestone_id, milestone_name, caption_text, story_caption, feed_artwork_url, story_artwork_url, schedule_at, delivery_method, platforms",
      )
      .eq("event_id", input.eventId),
    loadCampaignBuilderSession(input.eventId),
    getEventById(input.eventId),
  ]);

  const schedulingRows = schedulingResult.data ?? [];
  const sessionMilestones =
    session?.milestones?.map((milestone) => ({
      id: milestone.id,
      name: milestone.name,
      relativeDay:
        event?.date && milestone.suggestedDate
          ? playbookRelativeDay(event.date, milestone.suggestedDate)
          : null,
    })) ?? [];

  const artworkIndex = indexCb2ArtworkRows(
    schedulingRows.map((row) => ({
      campaignMilestoneId: (row.campaign_milestone_id as string | null) ?? null,
      milestoneName: String(row.milestone_name ?? ""),
      feedArtworkUrl: (row.feed_artwork_url as string | null) ?? null,
      storyArtworkUrl: (row.story_artwork_url as string | null) ?? null,
    })),
  );

  const resolvedArtwork = resolveCb2ArtworkForMilestone({
    milestoneId: input.campaignMilestoneId ?? null,
    milestoneTitle: input.milestoneTitle,
    relativeDay,
    sessionMilestones,
    index: artworkIndex,
  });

  const schedulingRow =
    (resolvedArtwork?.campaignMilestoneId
      ? schedulingRows.find(
          (row) =>
            row.campaign_milestone_id === resolvedArtwork.campaignMilestoneId,
        )
      : null) ??
    (input.milestoneTitle
      ? (() => {
          const key = milestoneNameMatchKey(input.milestoneTitle);
          const matches = schedulingRows.filter(
            (row) =>
              milestoneNameMatchKey(String(row.milestone_name ?? "")) === key,
          );
          return matches.length === 1 ? matches[0] : null;
        })()
      : null);

  if (
    schedulingRow &&
    (schedulingRow.feed_artwork_url ||
      schedulingRow.story_artwork_url ||
      schedulingRow.caption_text)
  ) {
    const platforms = Array.isArray(schedulingRow.platforms)
      ? (schedulingRow.platforms as string[])
      : empty.platforms;
    return {
      preview: {
        captionText: (schedulingRow.caption_text as string | null) ?? null,
        storyCaptionSnippet: (schedulingRow.story_caption as string | null) ?? null,
        feedArtworkUrl: (schedulingRow.feed_artwork_url as string | null) ?? null,
        storyArtworkUrl: (schedulingRow.story_artwork_url as string | null) ?? null,
      },
      scheduleLabel: schedulingRow.schedule_at
        ? formatDateTime(String(schedulingRow.schedule_at))
        : empty.scheduleLabel,
      platforms: platforms.length > 0 ? platforms : empty.platforms,
      deliveryMethod:
        (schedulingRow.delivery_method as string | null) ?? empty.deliveryMethod,
    };
  }

  // Artwork-only hit (ID matched) without a full scheduling row caption payload.
  if (resolvedArtwork) {
    return {
      ...empty,
      preview: {
        ...empty.preview,
        feedArtworkUrl: resolvedArtwork.feedArtworkUrl,
        storyArtworkUrl: resolvedArtwork.storyArtworkUrl,
      },
    };
  }

  const bundles = await getMetaPublishBundles(input.eventId);
  const milestoneKey = milestoneNameMatchKey(input.milestoneTitle ?? "");
  const bundle =
    (relativeDay === null
      ? null
      : bundles.find((entry) => entry.relativeDay === relativeDay)) ??
    (milestoneKey
      ? bundles.find(
          (entry) => milestoneNameMatchKey(entry.title) === milestoneKey,
        )
      : null) ??
    null;

  if (!bundle) {
    return empty;
  }

  const platforms = Object.entries(bundle.publishPlatforms)
    .filter(([, enabled]) => enabled)
    .map(([platform]) => platform);

  return {
    preview: {
      captionText: bundle.captionPreview,
      storyCaptionSnippet: bundle.storyCaptionPreview,
      feedArtworkUrl: bundle.feedArtworkUrl,
      storyArtworkUrl: bundle.storyArtworkUrl,
    },
    scheduleLabel: bundle.scheduledFor
      ? formatDateTime(bundle.scheduledFor)
      : empty.scheduleLabel,
    platforms: platforms.length > 0 ? platforms : empty.platforms,
    deliveryMethod: "auto-publish",
  };
}
