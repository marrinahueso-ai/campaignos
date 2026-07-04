import {
  buildArtworkPhaseItemsFromMilestones,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import {
  metaWorkflowMilestonesFromStepRows,
  resolveSocialMetaMilestonesForEvent,
} from "@/lib/campaign-plan/resolve-plan-milestones";
import { resolveMilestonePhaseAsset } from "@/lib/artwork-v2/milestone-assets";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
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

  return {
    feedUrl:
      isApprovedArtworkAsset(feedAsset) && feedAsset?.storagePath
        ? resolveAssetImageUrl(feedAsset.storagePath)
        : null,
    storyUrl:
      isApprovedArtworkAsset(storyAsset) && storyAsset?.storagePath
        ? resolveAssetImageUrl(storyAsset.storagePath)
        : null,
  };
}
