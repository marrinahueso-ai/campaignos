import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapEventRows } from "@/lib/events/mappers";
import { isCampaignPageStrategy } from "@/lib/events/communication-strategy";
import type { Event, EventRow } from "@/types";

/** Events on the Campaigns page — full campaigns and reminder-only social plans. */
export async function getCampaignPageEvents(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch campaign page events:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]).filter((event) =>
    isCampaignPageStrategy(event.communicationStrategy),
  );
}

/** Event ids with at least one Meta slot scheduled or approved for posting. */
export async function getMetaScheduledEventIds(
  eventIds: string[],
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meta_publication_slots")
    .select("event_id, status")
    .in("event_id", eventIds)
    .in("status", ["scheduled", "approved"]);

  if (error) {
    if (error.code === "42P01" || error.message.includes("meta_publication_slots")) {
      return new Set();
    }

    console.error("Failed to fetch meta publication slots:", error.message);
    return new Set();
  }

  const scheduled = new Set<string>();
  for (const row of data ?? []) {
    scheduled.add(row.event_id);
  }

  return scheduled;
}
