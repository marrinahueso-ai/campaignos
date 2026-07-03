import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { EventType } from "@/types/playbooks";

export async function updateEventPlanningFields(
  eventId: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("events")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) {
    console.error("Failed to update event planning fields:", error.message);
    return false;
  }

  return true;
}

export type EventPlanningFieldUpdate = {
  goal?: string | null;
  location?: string | null;
  budget?: string | null;
  audience?: string | null;
  expected_attendance?: string | null;
  event_type?: EventType;
  planning_quick_links?: Record<string, unknown>;
  planning_vendors?: unknown[];
  approved_square_image_url?: string | null;
  approved_square_image_status?: "open" | "filled";
};
