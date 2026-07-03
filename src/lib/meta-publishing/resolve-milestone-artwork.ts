import {
  buildArtworkPhaseItemsFromMilestones,
  isApprovedArtworkAsset,
} from "@/lib/artwork-v2/campaign-phases";
import { resolveArtworkMilestonesForEvent } from "@/lib/campaign-plan/resolve-plan-milestones";
import { getCampaignAssetsForEvent } from "@/lib/creative-assets/queries";
import { resolveWorkflowAsset } from "@/lib/creative-studio/artwork-workflow";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { getEventById } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import type { EventCommunicationStepRow } from "@/types/playbooks";

/** Matches milestone list used by getMetaPublishBundles for artwork previews. */
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
      .select("relative_day, title, sort_order")
      .eq("event_id", input.eventId)
      .order("sort_order", { ascending: true }),
  ]);

  const steps = (stepsResult.data ?? []) as EventCommunicationStepRow[];
  const planMilestones =
    steps.length > 0
      ? milestonesForScheduleDisplay(steps)
      : await resolveArtworkMilestonesForEvent(input.eventId);

  const phaseItems = buildArtworkPhaseItemsFromMilestones(planMilestones);
  const feedPhase = phaseItems.find(
    (phase) => phase.relativeDay === input.relativeDay && phase.metaPlacement === "feed",
  );
  const storyPhase = phaseItems.find(
    (phase) => phase.relativeDay === input.relativeDay && phase.metaPlacement === "story",
  );

  const feedAsset = feedPhase ? resolveWorkflowAsset(feedPhase, null, assets) : null;
  const storyAsset = storyPhase ? resolveWorkflowAsset(storyPhase, null, assets) : null;

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
