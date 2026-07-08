"use server";

import { createClient } from "@/lib/supabase/server";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";

export async function loadCampaignBuilderSessionAction(
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
  return {
    ...sessionData,
    eventId,
    currentStep:
      (data.current_step as CampaignBuilderSession["currentStep"]) ??
      sessionData.currentStep,
  };
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
    return {
      success: false,
      message: "Could not save to database — using local backup.",
    };
  }

  return { success: true, message: "Session saved." };
}
