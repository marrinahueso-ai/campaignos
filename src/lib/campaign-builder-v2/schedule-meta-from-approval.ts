import "server-only";

import { isPlaceholderArtworkUrl } from "@/lib/campaign-builder-v2/platform-utils";
import {
  milestoneNameMatchKey,
  normalizeMilestoneName,
} from "@/lib/campaign-builder-v2/milestone-names";
import { resolveRelativeDayFromApprovalInputs } from "@/lib/campaign-builder-v2/relative-day-from-approval";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { syncCampaignBuilderMilestoneArtwork } from "@/lib/campaign-builder-v2/hero-sync";
import type {
  DeliveryMethod,
  MilestonePreviewContent,
  PlatformFormat,
} from "@/lib/campaign-builder-v2/types";
import { META_PUBLISH_TARGETS } from "@/lib/artwork-v2/campaign-phases";
import { getEventById } from "@/lib/events/queries";
import { upsertMetaSocialCaption } from "@/lib/meta-captions/queries";
import { publishModeToDb } from "@/lib/meta-publishing/publish-mode";
import { syncMetaPublicationSlots } from "@/lib/meta-publishing/sync-slots";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { createClient } from "@/lib/supabase/server";
import { combineLocalDateAndTimeToIso } from "@/lib/utils/dates";

export { resolveRelativeDayFromApprovalInputs } from "@/lib/campaign-builder-v2/relative-day-from-approval";

const FEED_FORMATS = new Set<PlatformFormat>([
  "facebook-feed",
  "instagram-feed",
]);

export function previewHasFeedFormats(
  enabledFormats: PlatformFormat[],
): boolean {
  return enabledFormats.some((format) => FEED_FORMATS.has(format));
}

import {
  previewHasManualStoryKit,
  resolveManualEmailSendIso,
} from "@/lib/campaign-builder-v2/manual-email-scheduling";

export { previewHasManualStoryKit, resolveManualEmailSendIso };

/** Hybrid: Meta feed schedule + Socials story kit email. */
export function previewIsHybridFeedAndManualStory(
  preview: MilestonePreviewContent,
): boolean {
  return (
    previewHasFeedFormats(preview.enabledFormats) &&
    Boolean(preview.artwork.feedUrl?.trim()) &&
    !isPlaceholderArtworkUrl(preview.artwork.feedUrl ?? "") &&
    previewHasManualStoryKit(preview) &&
    preview.deliveryMethod !== "draft-only"
  );
}

export function previewWantsMetaFeedSchedule(
  preview: MilestonePreviewContent,
): boolean {
  if (preview.deliveryMethod === "draft-only") {
    return false;
  }

  const feedUrl = preview.artwork.feedUrl?.trim() || null;
  if (!feedUrl || isPlaceholderArtworkUrl(feedUrl)) {
    return false;
  }

  if (!previewHasFeedFormats(preview.enabledFormats)) {
    return false;
  }

  // Explicit schedule / auto-publish always schedules Meta feed.
  if (
    preview.deliveryMethod === "schedule" ||
    preview.deliveryMethod === "auto-publish"
  ) {
    return true;
  }

  // Send-to can coerce UI toward manual-email; still schedule feed when hybrid.
  return previewIsHybridFeedAndManualStory(preview);
}

export function resolvePersistedDeliveryMethod(
  preview: MilestonePreviewContent,
): DeliveryMethod {
  if (preview.deliveryMethod === "draft-only") {
    return "draft-only";
  }

  if (previewWantsMetaFeedSchedule(preview)) {
    return preview.deliveryMethod === "auto-publish"
      ? "auto-publish"
      : "schedule";
  }

  if (
    preview.deliveryMethod === "manual-email" ||
    Boolean(preview.manualEmailTo.trim()) ||
    preview.enabledFormats.includes("instagram-story-manual")
  ) {
    return "manual-email";
  }

  return preview.deliveryMethod;
}

export function resolveFeedScheduleIso(
  preview: MilestonePreviewContent,
): string | null {
  return combineLocalDateAndTimeToIso(
    preview.scheduleDate,
    preview.scheduleTime,
  );
}

/** schedule_at column: feed publish time when Meta feed is involved, else email time. */
export function resolvePersistedScheduleAt(
  preview: MilestonePreviewContent,
): string | null {
  if (previewWantsMetaFeedSchedule(preview)) {
    return resolveFeedScheduleIso(preview);
  }

  if (previewHasManualStoryKit(preview)) {
    return resolveManualEmailSendIso(preview);
  }

  return resolveFeedScheduleIso(preview);
}

async function resolveRelativeDayForMilestone(input: {
  eventId: string;
  eventDate: string;
  milestoneName: string;
  campaignMilestoneId: string | null;
  feedScheduleAt: string | null;
}): Promise<number | null> {
  const supabase = await createClient();
  const targetKey = milestoneNameMatchKey(input.milestoneName);

  const { data: steps } = await supabase
    .from("event_communication_steps")
    .select("relative_day, title, channel")
    .eq("event_id", input.eventId)
    .in("channel", ["facebook", "instagram"]);

  const titleMatch = (steps ?? []).find(
    (step) => milestoneNameMatchKey(String(step.title ?? "")) === targetKey,
  );

  let suggestedDate: string | null = null;
  const session = await loadCampaignBuilderSession(input.eventId);
  if (session) {
    const milestone =
      session.milestones.find((entry) => entry.id === input.campaignMilestoneId) ??
      session.milestones.find(
        (entry) => milestoneNameMatchKey(entry.name) === targetKey,
      );
    suggestedDate = milestone?.suggestedDate ?? null;
  }

  return resolveRelativeDayFromApprovalInputs({
    stepTitleMatchDay:
      titleMatch && typeof titleMatch.relative_day === "number"
        ? titleMatch.relative_day
        : null,
    suggestedDate,
    feedScheduleAt: input.feedScheduleAt,
    eventDate: input.eventDate,
  });
}

/** When CB2 publish day is not a playbook step day, create Meta slots so cron can post. */
async function ensureMetaSlotsForRelativeDay(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  scheduledFor: string;
  storyManual: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("meta_publication_slots")
    .select("id")
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .limit(1);

  if (existingError || (existing?.length ?? 0) > 0) {
    return;
  }

  const now = new Date().toISOString();
  const targets = input.storyManual
    ? META_PUBLISH_TARGETS.filter((target) => target.placement === "feed")
    : META_PUBLISH_TARGETS;

  await supabase.from("meta_publication_slots").insert(
    targets.map((target) => ({
      event_id: input.eventId,
      relative_day: input.relativeDay,
      milestone_title: input.milestoneTitle,
      platform: target.platform,
      placement: target.placement,
      scheduled_for: input.scheduledFor,
      status: "draft",
      updated_at: now,
    })),
  );
}

async function applyPublishModeForHybrid(input: {
  eventId: string;
  relativeDay: number;
  storyManual: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const mode = input.storyManual
    ? publishModeToDb("feed_auto_story_manual")
    : publishModeToDb("feed_and_story_auto");

  await supabase
    .from("event_communication_steps")
    .update({
      meta_publish_surfaces: mode.metaPublishSurfaces,
      story_manual_publish: mode.storyManualPublish,
      updated_at: now,
    })
    .eq("event_id", input.eventId)
    .eq("relative_day", input.relativeDay)
    .in("channel", ["facebook", "instagram"]);
}

async function upsertApprovedCaptions(input: {
  eventId: string;
  relativeDay: number;
  milestoneTitle: string;
  feedCaption: string | null;
  storyCaption: string | null;
  storyManual: boolean;
}): Promise<void> {
  const feed = input.feedCaption?.trim();
  if (feed) {
    await upsertMetaSocialCaption({
      eventId: input.eventId,
      relativeDay: input.relativeDay,
      milestoneTitle: input.milestoneTitle,
      placement: "feed",
      content: feed,
      status: "approved",
    });
  }

  if (!input.storyManual) {
    const story = input.storyCaption?.trim() || feed;
    if (story) {
      await upsertMetaSocialCaption({
        eventId: input.eventId,
        relativeDay: input.relativeDay,
        milestoneTitle: input.milestoneTitle,
        placement: "story",
        content: story,
        status: "approved",
      });
    }
  }
}

/**
 * After CB2 Approvals approve: sync artwork/captions and commit Meta feed slots
 * so calendar + cron see scheduled/approved feeds. Story-manual stays off Meta.
 */
export async function scheduleMetaFeedFromCampaignBuilderApproval(input: {
  eventId: string;
  milestoneName: string;
  campaignMilestoneId: string | null;
  feedArtworkUrl: string | null;
  storyArtworkUrl: string | null;
  captionText: string | null;
  storyCaption: string | null;
  feedScheduleAt: string | null;
  /** When false, skip Meta scheduling (pure story kit / draft). */
  wantsMetaFeedSchedule: boolean;
  /** Manual Instagram story — exclude story slots from Meta auto-publish. */
  storyManual: boolean;
}): Promise<{ scheduled: boolean; relativeDay: number | null; error?: string }> {
  const feedUrl = input.feedArtworkUrl?.trim() || null;
  if (!feedUrl || isPlaceholderArtworkUrl(feedUrl) || !input.wantsMetaFeedSchedule) {
    return { scheduled: false, relativeDay: null };
  }

  const event = await getEventById(input.eventId);
  if (!event?.date) {
    return {
      scheduled: false,
      relativeDay: null,
      error: "Campaign event not found.",
    };
  }

  const relativeDay = await resolveRelativeDayForMilestone({
    eventId: input.eventId,
    eventDate: event.date,
    milestoneName: input.milestoneName,
    campaignMilestoneId: input.campaignMilestoneId,
    feedScheduleAt: input.feedScheduleAt,
  });

  if (relativeDay === null) {
    return {
      scheduled: false,
      relativeDay: null,
      error: "Unable to map milestone to a playbook day.",
    };
  }

  const milestoneTitle = normalizeMilestoneName(input.milestoneName);
  const storyManual = input.storyManual;

  const session = await loadCampaignBuilderSession(input.eventId);

  if (session) {
    const match =
      (input.campaignMilestoneId
        ? session.milestones.find((entry) => entry.id === input.campaignMilestoneId)
        : null) ??
      session.milestones.find(
        (entry) =>
          milestoneNameMatchKey(entry.name) === milestoneNameMatchKey(milestoneTitle),
      );

    if (match) {
      await syncCampaignBuilderMilestoneArtwork({
        eventId: input.eventId,
        milestones: session.milestones,
        milestoneId: match.id,
        artwork: {
          feedUrl: feedUrl,
          storyUrl: input.storyArtworkUrl,
        },
        options: { revalidate: false },
      });
    }
  }

  await applyPublishModeForHybrid({
    eventId: input.eventId,
    relativeDay,
    storyManual,
  });

  await upsertApprovedCaptions({
    eventId: input.eventId,
    relativeDay,
    milestoneTitle,
    feedCaption: input.captionText,
    storyCaption: input.storyCaption,
    storyManual,
  });

  await syncMetaPublicationSlots(input.eventId);

  const supabase = await createClient();
  const now = new Date().toISOString();
  const scheduledFor = input.feedScheduleAt ?? now;

  // Playbook sync only creates slots for known communication steps. CB2
  // milestones with a custom publish date (e.g. Announcement on -27) need slots.
  await ensureMetaSlotsForRelativeDay({
    eventId: input.eventId,
    relativeDay,
    milestoneTitle,
    scheduledFor,
    storyManual,
  });

  // Commit feed placements only when story is manual; otherwise commit all auto targets.
  let query = supabase
    .from("meta_publication_slots")
    .update({
      status: "approved",
      scheduled_for: scheduledFor,
      milestone_title: milestoneTitle,
      updated_at: now,
    })
    .eq("event_id", input.eventId)
    .eq("relative_day", relativeDay)
    .in("status", ["draft", "scheduled", "approved", "failed"]);

  if (storyManual) {
    query = query.eq("placement", "feed");
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error(
      "Failed to schedule Meta feed slots from CB2 approval:",
      error.message,
    );
    return {
      scheduled: false,
      relativeDay,
      error: error.message,
    };
  }

  if (storyManual) {
    // Cancel leftover auto story slots for this day.
    await supabase
      .from("meta_publication_slots")
      .update({ status: "cancelled", updated_at: now })
      .eq("event_id", input.eventId)
      .eq("relative_day", relativeDay)
      .eq("placement", "story")
      .in("status", ["draft", "scheduled", "approved", "failed"]);
  }

  if ((data?.length ?? 0) > 0) {
    try {
      const { createNativeMetaSchedulesForMilestone } = await import(
        "@/lib/meta-publishing/native-schedule"
      );
      const native = await createNativeMetaSchedulesForMilestone({
        eventId: input.eventId,
        relativeDay,
      });
      if (native.warnings.length > 0) {
        console.warn(
          "Meta-native schedule after CB2 approve (soft):",
          native.warnings.join("; "),
        );
      }
    } catch (error) {
      console.warn("Meta-native schedule after CB2 approve failed (soft):", error);
    }
  }

  revalidateEventPaths(input.eventId);

  return {
    scheduled: (data?.length ?? 0) > 0,
    relativeDay,
  };
}

/**
 * Repair already-approved CB2 items that lost Meta feed scheduling
 * (e.g. Send-to coerced delivery to manual-email).
 */
export async function repairCampaignBuilderMetaSchedulesForEvent(
  eventId: string,
): Promise<{ repaired: number; errors: string[] }> {
  const session = await loadCampaignBuilderSession(eventId);
  if (!session) {
    return { repaired: 0, errors: ["Campaign builder session not found."] };
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("approval_scheduling_items")
    .select("*")
    .eq("event_id", eventId)
    .eq("source", "campaign_builder")
    .in("workflow_status", ["scheduled", "published", "posted"]);

  if (error) {
    return { repaired: 0, errors: [error.message] };
  }

  let repaired = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  for (const row of rows ?? []) {
    const preview = session.previewContents.find(
      (entry) => entry.milestoneId === row.campaign_milestone_id,
    );
    if (!preview || !previewWantsMetaFeedSchedule(preview)) {
      continue;
    }

    const feedScheduleAt = resolveFeedScheduleIso(preview);
    const manualEmailSendAt = resolveManualEmailSendIso(preview);
    const deliveryMethod = resolvePersistedDeliveryMethod(preview);

    await supabase
      .from("approval_scheduling_items")
      .update({
        delivery_method: deliveryMethod,
        schedule_at: feedScheduleAt,
        manual_email_send_at: manualEmailSendAt,
        manual_email_to: preview.manualEmailTo.trim() || row.manual_email_to,
        updated_at: now,
      })
      .eq("id", row.id);

    const result = await scheduleMetaFeedFromCampaignBuilderApproval({
      eventId,
      milestoneName: row.milestone_name as string,
      campaignMilestoneId: row.campaign_milestone_id as string | null,
      feedArtworkUrl:
        (row.feed_artwork_url as string | null) ?? preview.artwork.feedUrl,
      storyArtworkUrl:
        (row.story_artwork_url as string | null) ?? preview.artwork.storyUrl,
      captionText: (row.caption_text as string | null) ?? null,
      storyCaption: (row.story_caption as string | null) ?? null,
      feedScheduleAt,
      wantsMetaFeedSchedule: true,
      storyManual: previewHasManualStoryKit(preview),
    });

    if (result.error) {
      errors.push(`${row.milestone_name}: ${result.error}`);
      continue;
    }

    if (result.scheduled) {
      repaired += 1;
    }
  }

  return { repaired, errors };
}
