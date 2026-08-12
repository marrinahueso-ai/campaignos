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
 *
 * Pass `previous` from the loaded session to skip no-op name syncs on routine
 * autosaves (avoids N UPDATEs on approval_scheduling_items every keystroke).
 */
export async function syncSchedulingMilestoneNamesFromSession(
  session: CampaignBuilderSession,
  previous?: CampaignBuilderSession | null,
): Promise<void> {
  const eventId = session.eventId?.trim();
  if (
    !eventId ||
    !Array.isArray(session.milestones) ||
    session.milestones.length === 0
  ) {
    return;
  }

  const campaignName = session.inspiration?.campaignName?.trim() || null;
  const prevCampaignName =
    previous?.inspiration?.campaignName?.trim() || null;
  const prevById = new Map<string, string>();
  if (Array.isArray(previous?.milestones)) {
    for (const milestone of previous.milestones) {
      const id = String(milestone?.id ?? "").trim();
      const name = normalizeMilestoneName(String(milestone?.name ?? ""));
      if (id) prevById.set(id, name);
    }
  }

  const changed = session.milestones.filter((milestone) => {
    const milestoneId = String(milestone.id ?? "").trim();
    const milestoneName = normalizeMilestoneName(String(milestone.name ?? ""));
    if (!milestoneId || isChannelPostName(milestoneName)) {
      return false;
    }
    if (prevById.get(milestoneId) !== milestoneName) {
      return true;
    }
    // Campaign name change still needs a row patch when names are otherwise equal.
    return campaignName !== prevCampaignName && Boolean(campaignName);
  });

  if (changed.length === 0 && previous) {
    return;
  }

  const supabase = await createClient();
  const now = new Date().toISOString();
  const toSync = previous ? changed : session.milestones;

  await Promise.all(
    toSync.map(async (milestone) => {
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
