import "server-only";

import { cache } from "react";
import { applySchedulingRowsToSession } from "@/lib/campaign-builder-v2/sync-session-from-scheduling";
import { createClient } from "@/lib/supabase/server";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";

async function loadCampaignBuilderSessionUncached(
  eventId: string,
): Promise<CampaignBuilderSession | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_builder_sessions")
    .select("session_data, current_step")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load campaign builder session:", error.message);
    return null;
  }

  if (!data?.session_data) {
    return null;
  }

  const sessionData = data.session_data as CampaignBuilderSession;
  const session: CampaignBuilderSession = {
    ...sessionData,
    eventId,
    currentStep:
      (data.current_step as CampaignBuilderSession["currentStep"]) ??
      sessionData.currentStep,
  };

  // Approvals hub is source of truth after approve — heal sticky
  // awaiting_approval / Pending labels left in the CB2 session JSON.
  const { data: schedulingRows } = await supabase
    .from("approval_scheduling_items")
    .select("campaign_milestone_id, milestone_name, workflow_status, notes")
    .eq("event_id", eventId)
    .in("workflow_status", [
      "scheduled",
      "posted",
      "published",
      "changes_requested",
    ]);

  if (!schedulingRows?.length) {
    return session;
  }

  return applySchedulingRowsToSession(
    session,
    schedulingRows.map((row) => ({
      campaignMilestoneId: (row.campaign_milestone_id as string | null) ?? null,
      milestoneName: String(row.milestone_name ?? ""),
      workflowStatus: String(row.workflow_status ?? ""),
      notes: (row.notes as string | null) ?? null,
    })),
  );
}

/** Per-request cached session load for the campaign builder page. */
export const loadCampaignBuilderSession = cache(loadCampaignBuilderSessionUncached);
