"use server";

import { protectSessionFromRichnessDowngrade } from "@/lib/campaign-builder-v2/normalize-session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { requireEventAccess } from "@/lib/events/queries";
import { createClient } from "@/lib/supabase/server";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";

export async function loadCampaignBuilderSessionAction(
  eventId: string,
): Promise<CampaignBuilderSession | null> {
  const access = await requireEventAccess(eventId);
  if ("error" in access) {
    return null;
  }
  return loadCampaignBuilderSession(eventId);
}

export async function saveCampaignBuilderSessionAction(
  session: CampaignBuilderSession,
): Promise<{ success: boolean; message: string }> {
  const access = await requireEventAccess(session.eventId);
  if ("error" in access) {
    return {
      success: false,
      message: access.error,
    };
  }

  const supabase = await createClient();

  // Never let an empty/failed client snapshot erase richer server artwork.
  const existing = await loadCampaignBuilderSession(session.eventId);
  const protectedSession = protectSessionFromRichnessDowngrade(session, existing);

  const { error } = await supabase.from("campaign_builder_sessions").upsert(
    {
      event_id: protectedSession.eventId,
      current_step: protectedSession.currentStep,
      session_data: protectedSession,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "event_id" },
  );

  if (error) {
    console.error("Failed to save campaign builder session:", error.message);
    const { reportIntegrationError } = await import(
      "@/lib/monitoring/report-error"
    );
    reportIntegrationError("supabase", error, {
      action: "saveCampaignBuilderSessionAction",
      eventId: protectedSession.eventId,
      message: error.message,
    });
    return {
      success: false,
      message: "Could not save online — keeping a backup on this device.",
    };
  }

  // Keep Approvals Post name in sync when Social renames a post.
  const { syncSchedulingMilestoneNamesFromSession } = await import(
    "@/lib/approvals-scheduling/live-milestone-names"
  );
  await syncSchedulingMilestoneNamesFromSession(protectedSession);

  return { success: true, message: "Session saved." };
}
