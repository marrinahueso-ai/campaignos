"use server";

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

  const { error } = await supabase.from("campaign_builder_sessions").upsert(
    {
      event_id: session.eventId,
      current_step: session.currentStep,
      session_data: session,
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
      eventId: session.eventId,
      message: error.message,
    });
    return {
      success: false,
      message: "Could not save to database — using local backup.",
    };
  }

  return { success: true, message: "Session saved." };
}
