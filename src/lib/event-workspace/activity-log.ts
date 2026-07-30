import { createClient } from "@/lib/supabase/server";

/**
 * Activity is a customer-facing event record. A logging failure must never
 * reverse the workflow mutation that already succeeded.
 */
export async function logEventActivity(input: {
  eventId: string;
  activityType: "board_approval" | "published";
  title: string;
  description: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("activity_log").insert({
      event_id: input.eventId,
      activity_type: input.activityType,
      title: input.title,
      description: input.description,
      occurred_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to log event activity:", error.message);
    }
  } catch (error) {
    console.error("Failed to log event activity:", error);
  }
}
