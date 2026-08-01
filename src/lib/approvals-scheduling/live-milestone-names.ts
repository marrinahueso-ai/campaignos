import "server-only";

import { normalizeMilestoneName } from "@/lib/campaign-builder-v2/milestone-names";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";
import { createClient } from "@/lib/supabase/server";
import {
  applyLiveMilestoneNames,
  isChannelPostName,
} from "@/lib/approvals-scheduling/milestone-display-names";

export {
  applyLiveMilestoneNames,
  displayApprovalPostName,
  isChannelPostName,
} from "@/lib/approvals-scheduling/milestone-display-names";

/**
 * Live post names from Create with AI sessions, keyed by campaign_milestone_id.
 * Session milestones are the source of truth when Social renames a post.
 */
export async function loadLiveMilestoneNamesById(
  eventIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(eventIds.map((id) => id.trim()).filter(Boolean))];
  const names = new Map<string, string>();
  if (unique.length === 0) {
    return names;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaign_builder_sessions")
    .select("event_id, session_data")
    .in("event_id", unique);

  if (error) {
    console.error("Failed to load live milestone names:", error.message);
    return names;
  }

  for (const row of data ?? []) {
    const session = row.session_data as CampaignBuilderSession | null;
    const milestones = session?.milestones;
    if (!Array.isArray(milestones)) {
      continue;
    }
    for (const milestone of milestones) {
      const id = String(milestone?.id ?? "").trim();
      const name = normalizeMilestoneName(String(milestone?.name ?? ""));
      if (!id || isChannelPostName(name)) {
        continue;
      }
      names.set(id, name);
    }
  }

  return names;
}

/**
 * When Social renames a post, keep pending approval rows in sync so the
 * Approvals hub Post name matches Create with AI.
 */
export async function syncSchedulingMilestoneNamesFromSession(
  session: CampaignBuilderSession,
): Promise<void> {
  const eventId = session.eventId?.trim();
  if (
    !eventId ||
    !Array.isArray(session.milestones) ||
    session.milestones.length === 0
  ) {
    return;
  }

  const supabase = await createClient();
  const campaignName = session.inspiration?.campaignName?.trim() || null;
  const now = new Date().toISOString();

  await Promise.all(
    session.milestones.map(async (milestone) => {
      const milestoneId = String(milestone.id ?? "").trim();
      const milestoneName = normalizeMilestoneName(String(milestone.name ?? ""));
      if (!milestoneId || isChannelPostName(milestoneName)) {
        return;
      }

      const patch: Record<string, string> = {
        milestone_name: milestoneName,
        updated_at: now,
      };
      if (campaignName) {
        patch.campaign_name = campaignName;
      }

      const { error } = await supabase
        .from("approval_scheduling_items")
        .update(patch)
        .eq("event_id", eventId)
        .eq("campaign_milestone_id", milestoneId);

      if (error && error.code !== "42P01") {
        console.error(
          "Failed to sync approval milestone name:",
          error.message,
        );
      }
    }),
  );
}
