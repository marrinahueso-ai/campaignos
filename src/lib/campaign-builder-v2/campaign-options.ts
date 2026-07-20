import "server-only";

import {
  buildPlanningHubSwitcherEvents,
  resolvePlanningHubSwitcherDateWindow,
} from "@/lib/events/campaign-page-utils";
import {
  isCampaignPageStrategy,
  parseCommunicationStrategy,
} from "@/lib/events/communication-strategy";
import {
  getOrganizationSchoolYearIds,
  resolveScopedOrganizationId,
} from "@/lib/events/org-scope";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import { createClient } from "@/lib/supabase/server";
import type { CampaignOption } from "@/lib/campaign-builder-v2/types";
import type { Event } from "@/types";

function formatEventDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function buildCampaignOptionLabel(title: string, date: string): string {
  return `${title} — ${formatEventDate(date)}`;
}

function toCampaignOption(event: {
  id: string;
  title: string;
  date: string;
  description: string | null;
}): CampaignOption {
  return {
    id: event.id,
    title: event.title,
    label: buildCampaignOptionLabel(event.title, event.date),
    date: event.date,
    description: event.description ?? "",
  };
}

/** Minimal Event fields needed by `buildPlanningHubSwitcherEvents`. */
function toSwitcherEvent(row: {
  id: string;
  title: string;
  description: string | null;
  date: string;
  communication_strategy: string | null;
  school_year_id: string | null;
  status: string | null;
}): Event {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    date: row.date,
    time: null,
    location: null,
    audience: null,
    theme: null,
    status: (row.status as Event["status"]) ?? "draft",
    category: null,
    eventType: null,
    communicationStrategy: parseCommunicationStrategy(row.communication_strategy),
    calendarImportId: null,
    eventOwner: null,
    approvalOrganizationRoleId: null,
    budget: null,
    volunteerNeeds: null,
    goal: null,
    expectedAttendance: null,
    planningQuickLinks: {},
    planningVendors: [],
    approvedSquareImageUrl: null,
    approvedSquareImageStatus: "open",
    schoolYearId: row.school_year_id,
    createdAt: "",
    updatedAt: null,
  };
}

/**
 * Campaign dropdown options — current school year (July–June window),
 * alphabetically by campaign name, with date in the display label.
 *
 * Uses a lean column select (not `events.*`) and resolves org/school-year
 * once — the previous path double-fetched school year and pulled full rows
 * for every campaign in the year.
 */
export async function getCampaignBuilderCampaignOptions(
  organizationId: string | null,
  currentEvent: Event,
): Promise<CampaignOption[]> {
  const scopedOrgId = await resolveScopedOrganizationId(organizationId);

  if (!scopedOrgId) {
    return [toCampaignOption(currentEvent)];
  }

  const [activeSchoolYear, schoolYearIds] = await Promise.all([
    getActiveSchoolYear(scopedOrgId),
    getOrganizationSchoolYearIds(scopedOrgId),
  ]);

  if (!schoolYearIds.length) {
    return [toCampaignOption(currentEvent)];
  }

  const dateWindow = resolvePlanningHubSwitcherDateWindow(
    activeSchoolYear?.label,
  );
  const supabase = await createClient();

  let query = supabase
    .from("events")
    .select(
      "id, title, description, date, communication_strategy, school_year_id, status",
    )
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (schoolYearIds.length === 1) {
    query = query.eq("school_year_id", schoolYearIds[0]!);
  } else {
    query = query.in("school_year_id", schoolYearIds);
  }

  query = query
    .gte("date", dateWindow.startDate)
    .lte("date", dateWindow.endDate);

  const { data, error } = await query;

  if (error) {
    console.error(
      "Failed to fetch campaign builder campaign options:",
      error.message,
    );
    return [toCampaignOption(currentEvent)];
  }

  const campaignEvents = (
    (data ?? []) as Array<{
      id: string;
      title: string;
      description: string | null;
      date: string;
      communication_strategy: string | null;
      school_year_id: string | null;
      status: string | null;
    }>
  )
    .map(toSwitcherEvent)
    .filter((event) => isCampaignPageStrategy(event.communicationStrategy));

  const switcherEvents = buildPlanningHubSwitcherEvents(
    campaignEvents,
    currentEvent,
    { dateWindow },
  );

  return [...switcherEvents]
    .sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
    )
    .map((event) => toCampaignOption(event));
}
