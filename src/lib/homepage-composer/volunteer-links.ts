import "server-only";

import { parsePlanningQuickLinks } from "@/lib/event-playbooks/planning-constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Resolve volunteer page URLs for homepage cards.
 * Prefers planning "Volunteer Signup" link; falls back to connected SignUpGenius.
 */
export async function getEventVolunteerSignupUrls(
  eventIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  const result = new Map<string, string>();
  if (uniqueIds.length === 0) return result;

  const supabase = await createClient();

  const { data: eventRows, error: eventError } = await supabase
    .from("events")
    .select("id, planning_quick_links")
    .in("id", uniqueIds);

  if (eventError) {
    console.error(
      "Failed to load planning volunteer links:",
      eventError.message,
    );
  } else {
    for (const row of eventRows ?? []) {
      const url =
        parsePlanningQuickLinks(row.planning_quick_links).volunteer_signup?.url?.trim() ??
        "";
      if (url) result.set(row.id, url);
    }
  }

  const missing = uniqueIds.filter((id) => !result.get(id));
  if (missing.length === 0) return result;

  const { data: sources, error: sourceError } = await supabase
    .from("event_volunteer_sources")
    .select("event_id, source_url")
    .in("event_id", missing)
    .in("status", ["pending_review", "connected", "error"]);

  if (sourceError) {
    // Table may be unavailable in some envs — planning URL alone is enough.
    if (
      sourceError.code !== "42P01" &&
      !sourceError.message.includes("event_volunteer_sources")
    ) {
      console.error(
        "Failed to load SignUpGenius volunteer links:",
        sourceError.message,
      );
    }
    return result;
  }

  for (const row of sources ?? []) {
    const url =
      typeof row.source_url === "string" ? row.source_url.trim() : "";
    if (url && row.event_id && !result.has(row.event_id)) {
      result.set(row.event_id, url);
    }
  }

  return result;
}
