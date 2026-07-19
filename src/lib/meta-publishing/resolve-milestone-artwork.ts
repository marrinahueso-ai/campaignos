import {
  buildArtworkPhaseItemsFromMilestones,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import {
  metaWorkflowMilestonesFromStepRows,
  resolveSocialMetaMilestonesForEvent,
} from "@/lib/campaign-plan/resolve-plan-milestones";
import { resolveMilestonePhaseAsset } from "@/lib/artwork-v2/milestone-assets";
import { playbookRelativeDay } from "@/lib/campaign-builder-v2/campaign-timing";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import {
  indexCb2ArtworkRows,
  resolveCb2ArtworkForMilestone,
  type SessionMilestoneRef,
} from "@/lib/meta-publishing/cb2-artwork-identity";
import { createClient } from "@/lib/supabase/server";
import type { EventAsset } from "@/types/event-workspace";
import type { EventCommunicationStepRow } from "@/types/playbooks";

/** Matches milestone list used by getMetaPublishBundles for artwork previews. */
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

function assetUrl(asset: EventAsset | null): string | null {
  if (!isApprovedArtworkAsset(asset) || !asset?.storagePath) {
    return null;
  }
  return resolveAssetImageUrl(asset.storagePath);
}

/** When cron publishes a CB2 custom day (e.g. Announcement at −27), use slot title + approval URLs. */
async function resolveCb2ArtworkUrls(input: {
  eventId: string;
  relativeDay: number;
  eventDate: string | null | undefined;
}): Promise<{ feedUrl: string | null; storyUrl: string | null; milestoneTitle: string | null }> {
  const supabase = await createClient();
  const [slotsResult, approvalsResult, session] = await Promise.all([
    supabase
      .from("meta_publication_slots")
      .select("milestone_title")
      .eq("event_id", input.eventId)
      .eq("relative_day", input.relativeDay)
      .limit(8),
    supabase
      .from("approval_scheduling_items")
      .select(
        "campaign_milestone_id, milestone_name, feed_artwork_url, story_artwork_url",
      )
      .eq("event_id", input.eventId),
    loadCampaignBuilderSession(input.eventId),
  ]);

  const milestoneTitle =
    (slotsResult.data ?? [])
      .map((row) => String(row.milestone_title ?? "").trim())
      .find((title) => title.length > 0) ?? null;

  const index = indexCb2ArtworkRows(
    (approvalsResult.data ?? []).map((row) => ({
      campaignMilestoneId: (row.campaign_milestone_id as string | null) ?? null,
      milestoneName: String(row.milestone_name ?? ""),
      feedArtworkUrl: (row.feed_artwork_url as string | null) ?? null,
      storyArtworkUrl: (row.story_artwork_url as string | null) ?? null,
    })),
  );

  const sessionMilestones: SessionMilestoneRef[] = (session?.milestones ?? []).map(
    (milestone) => ({
      id: milestone.id,
      name: milestone.name,
      relativeDay:
        input.eventDate && milestone.suggestedDate
          ? playbookRelativeDay(input.eventDate, milestone.suggestedDate)
          : null,
    }),
  );

  const cb2 = resolveCb2ArtworkForMilestone({
    milestoneTitle,
    relativeDay: input.relativeDay,
    sessionMilestones,
    index,
  });

  return {
    feedUrl: cb2?.feedArtworkUrl?.trim() || null,
    storyUrl: cb2?.storyArtworkUrl?.trim() || null,
    milestoneTitle,
  };
}

export async function resolveMilestoneArtworkUrls(input: {
  eventId: string;
  relativeDay: number;
}): Promise<{ feedUrl: string | null; storyUrl: string | null }> {
  const event = await getEventById(input.eventId);
  if (!event) {
    return { feedUrl: null, storyUrl: null };
  }

  const supabase = await createClient();
  const [assets, stepsResult] = await Promise.all([
    getCampaignAssetsForEvent(input.eventId),
    supabase
      .from("event_communication_steps")
      .select("relative_day, title, sort_order, channel, status")
      .eq("event_id", input.eventId)
      .order("sort_order", { ascending: true }),
  ]);

  const steps = (stepsResult.data ?? []) as EventCommunicationStepRow[];
  const planMilestones =
    steps.length > 0
      ? metaWorkflowMilestonesFromStepRows(steps)
      : await resolveSocialMetaMilestonesForEvent(input.eventId);

  const phaseItems = buildArtworkPhaseItemsFromMilestones(planMilestones);
  const feedPhase = phaseItems.find(
    (phase) => phase.relativeDay === input.relativeDay && phase.metaPlacement === "feed",
  );
  const storyPhase = phaseItems.find(
    (phase) => phase.relativeDay === input.relativeDay && phase.metaPlacement === "story",
  );
  const titlesAtDay = milestoneTitlesAtDay(steps, input.relativeDay);

  const feedAsset = feedPhase
    ? resolveMilestonePhaseAsset(feedPhase, assets, titlesAtDay)
    : null;
  const storyAsset = storyPhase
    ? resolveMilestonePhaseAsset(storyPhase, assets, titlesAtDay)
    : null;

  let feedUrl = assetUrl(feedAsset);
  let storyUrl = assetUrl(storyAsset);

  if (feedUrl && storyUrl) {
    return { feedUrl, storyUrl };
  }

  // CB2 / Approvals auto-publish often lands on a custom relative day that is
  // not a playbook phase (Announcement on Jul 18 → −27). Fall back to slot title
  // + approval artwork URLs the same way calendar bundles do.
  const cb2 = await resolveCb2ArtworkUrls({
    eventId: input.eventId,
    relativeDay: input.relativeDay,
    eventDate: event.date,
  });

  feedUrl = feedUrl || cb2.feedUrl;
  storyUrl = storyUrl || cb2.storyUrl;

  if ((!feedUrl || !storyUrl) && cb2.milestoneTitle) {
    const syntheticFeed = {
      id: `cb2-feed-${input.relativeDay}`,
      label: cb2.milestoneTitle,
      assetType: "instagram_graphic" as const,
      formatLabel: "Feed (1:1)",
      metaPlacement: "feed" as const,
      required: true,
      sortOrder: 0,
    };
    const syntheticStory = {
      id: `cb2-story-${input.relativeDay}`,
      label: cb2.milestoneTitle,
      assetType: "instagram_story" as const,
      formatLabel: "Story",
      metaPlacement: "story" as const,
      required: true,
      sortOrder: 1,
    };
    const titledFeed = resolveMilestonePhaseAsset(syntheticFeed, assets, [
      cb2.milestoneTitle,
      ...titlesAtDay,
    ]);
    const titledStory = resolveMilestonePhaseAsset(syntheticStory, assets, [
      cb2.milestoneTitle,
      ...titlesAtDay,
    ]);
    feedUrl = feedUrl || assetUrl(titledFeed);
    storyUrl = storyUrl || assetUrl(titledStory);
  }

  return { feedUrl, storyUrl };
}
