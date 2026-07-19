"use server";

import { protectSessionFromRichnessDowngrade } from "@/lib/campaign-builder-v2/normalize-session";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import { createClient } from "@/lib/supabase/server";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";

export async function loadCampaignBuilderSessionAction(
  eventId: string,
): Promise<CampaignBuilderSession | null> {
  return loadCampaignBuilderSession(eventId);
}

export async function saveCampaignBuilderSessionAction(
  session: CampaignBuilderSession,
): Promise<{ success: boolean; message: string }> {
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
      message: "Could not save to database — using local backup.",
    };
  }

  return { success: true, message: "Session saved." };
}
