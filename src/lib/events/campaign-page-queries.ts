import "server-only";

import { createClient } from "@/lib/supabase/server";
import { mapEventRows } from "@/lib/events/mappers";
import { isCampaignPageStrategy } from "@/lib/events/communication-strategy";
import { resolvePlanningHubSwitcherDateWindow } from "@/lib/events/campaign-page-utils";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import type { Event, EventRow } from "@/types";

/** Columns used by Campaigns / Events Home list UI (no planning JSON blobs). */
const CAMPAIGN_PAGE_EVENT_SELECT = [
  "id",
  "title",
  "description",
  "date",
  "time",
  "location",
  "status",
  "category",
  "event_type",
  "communication_strategy",
  "event_owner",
  "school_year_id",
  "created_at",
  "updated_at",
].join(", ");

async function fetchScopedCampaignEvents(input: {
  organizationId?: string | null;
  dateWindow?: { startDate: string; endDate: string };
}): Promise<Event[]> {
  const { getOrganizationSchoolYearIds, resolveScopedOrganizationId } =
    await import("@/lib/events/org-scope");
  const scopedOrgId = await resolveScopedOrganizationId(input.organizationId);
  if (!scopedOrgId) {
    return [];
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
  if (!schoolYearIds.length) {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(CAMPAIGN_PAGE_EVENT_SELECT)
    .neq("status", "archived")
    // Keep null strategy (maps to full_campaign) and exclude calendar-only in SQL.
    .or(
      "communication_strategy.in.(full_campaign,reminder_only,custom),communication_strategy.is.null",
    )
    .order("date", { ascending: true });

  if (schoolYearIds.length === 1) {
    query = query.eq("school_year_id", schoolYearIds[0]!);
  } else {
    query = query.in("school_year_id", schoolYearIds);
  }

  if (input.dateWindow) {
    query = query
      .gte("date", input.dateWindow.startDate)
      .lte("date", input.dateWindow.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch campaign page events:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as unknown as EventRow[]).filter((event) =>
    isCampaignPageStrategy(event.communicationStrategy),
  );
}

/** Narrow event summaries for assigned-event lists (Person Profile, etc.). */
export async function getCampaignEventsByIds(
  eventIds: string[],
): Promise<Event[]> {
  const uniqueIds = [...new Set(eventIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(CAMPAIGN_PAGE_EVENT_SELECT)
    .in("id", uniqueIds)
    .neq("status", "archived");

  if (error) {
    console.error("Failed to fetch campaign events by id:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as unknown as EventRow[]);
}
/** Events on the Campaigns page — full campaigns and reminder-only social plans. */
export async function getCampaignPageEvents(
  organizationId?: string | null,
): Promise<Event[]> {
  return fetchScopedCampaignEvents({ organizationId });
}

/** Planning Hub switcher — active school year plus July–June date window. */
export async function getPlanningHubSwitcherEvents(
  organizationId?: string | null,
): Promise<Event[]> {
  const { resolveScopedOrganizationId } = await import("@/lib/events/org-scope");
  const scopedOrgId = await resolveScopedOrganizationId(organizationId);
  if (!scopedOrgId) {
    return [];
  }

  const activeSchoolYear = await getActiveSchoolYear(scopedOrgId);
  const dateWindow = resolvePlanningHubSwitcherDateWindow(activeSchoolYear?.label);

  return fetchScopedCampaignEvents({ organizationId, dateWindow });
}

/** Event ids that have at least one uploaded campaign file. */
export async function getEventIdsWithCampaignFiles(
  eventIds: string[],
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const { areEventPlaybookTablesAvailable } =
    await import("@/lib/event-playbooks/queries");
  if (!(await areEventPlaybookTablesAvailable())) {
    return new Set();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_playbook_files")
    .select("event_id")
    .in("event_id", eventIds);

  if (error) {
    if (error.code === "42P01" || error.message.includes("event_playbook_files")) {
      return new Set();
    }
    console.error("Failed to fetch campaign file event ids:", error.message);
    return new Set();
  }

  const withFiles = new Set<string>();
  for (const row of data ?? []) {
    withFiles.add(row.event_id);
  }
  return withFiles;
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
