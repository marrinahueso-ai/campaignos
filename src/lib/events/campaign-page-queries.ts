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
