import "server-only";

import { cache } from "react";
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
  return {
    ...sessionData,
    eventId,
    currentStep:
      (data.current_step as CampaignBuilderSession["currentStep"]) ??
      sessionData.currentStep,
  };
}

/** Per-request cached session load for the campaign builder page. */
export const loadCampaignBuilderSession = cache(loadCampaignBuilderSessionUncached);
