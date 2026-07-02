import { getMemoryHintsForEvents } from "@/lib/memory";
import {
  buildPlanningItemsFromRaw,
  buildStepsByEventIdFromRaw,
  TODAY_PLANNING_ITEM_OPTIONS,
} from "@/lib/communications-calendar/build-planning-items";
import { resolveTodayPlanningWindow } from "@/lib/communications-calendar/planning-date-window";
import { fetchPlanningRawDataForEvents } from "@/lib/communications-calendar/planning-raw";
import { getCampaignIntelligenceForEventsFromRaw } from "@/lib/campaign-intelligence/queries";
import { getEventsInDateRange, getUpcomingEvents } from "@/lib/events/queries";
import { isCampaignPageStrategy } from "@/lib/events/communication-strategy";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { buildTodayPageData } from "@/lib/today/build-today-data";
import { resolveTodayGreetingName } from "@/lib/today/greeting-name";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import { createClient } from "@/lib/supabase/server";
import type { Event, Organization } from "@/types";
import type { TodayPageData } from "@/types/today";
import type {
  OrganizationMemberRow,
  OrganizationRoleRow,
} from "@/types/organization-workspace";

const UPCOMING_CAMPAIGN_LIMIT = 10;

async function getTodayGreetingName(
  organization: Organization | null,
): Promise<string> {
  if (!organization) {
    return "there";
  }

  const supabase = await createClient();

  const [{ data: memberRows }, { data: roleRows }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("name, email, organization_role_id, active, created_at")
      .eq("organization_id", organization.id)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("organization_roles")
      .select("id, name, system_role")
      .eq("organization_id", organization.id),
  ]);

  const roleNameById = new Map(
    ((roleRows ?? []) as OrganizationRoleRow[]).map((row) => [row.id, row.name]),
  );

  const blockedRoleNames = ((roleRows ?? []) as OrganizationRoleRow[]).map(
    (row) => row.name,
  );

  return resolveTodayGreetingName({
    memberCandidates: ((memberRows ?? []) as OrganizationMemberRow[]).map(
      (member) => ({
        name: member.name,
        email: member.email,
        roleName: member.organization_role_id
          ? (roleNameById.get(member.organization_role_id) ?? null)
          : null,
      }),
    ),
    organizationContactName: organization.principal,
    organizationName: organization.name,
    blockedRoleNames,
  });
}

function mergeEventsById(...groups: Event[][]): Event[] {
  const byId = new Map<string, Event>();
  for (const group of groups) {
    for (const event of group) {
      byId.set(event.id, event);
    }
  }
  return [...byId.values()];
}

export async function getTodayPageData(
  organization?: Organization | null,
): Promise<TodayPageData> {
  const today = getTodayDateString();
  const resolvedOrganization =
    organization === undefined ? await getLatestOrganization() : organization;

  const todayWindow = resolveTodayPlanningWindow(resolvedOrganization?.schoolYear ?? null);

  const [upcomingCampaignEvents, eventsInWindow, firstName] = await Promise.all([
    getUpcomingEvents(UPCOMING_CAMPAIGN_LIMIT),
    getEventsInDateRange(todayWindow.startDate, todayWindow.endDate),
    getTodayGreetingName(resolvedOrganization),
  ]);

  const eventsForRaw = mergeEventsById(upcomingCampaignEvents, eventsInWindow);
  const eventIds = eventsForRaw.map((event) => event.id);

  const raw = await fetchPlanningRawDataForEvents(eventIds);
  const planningItems = buildPlanningItemsFromRaw(raw, TODAY_PLANNING_ITEM_OPTIONS);

  const [stepsByEventId, intelligenceByEventId, memoryHintsByEventId] =
    await Promise.all([
      Promise.resolve(buildStepsByEventIdFromRaw(raw, eventIds)),
      Promise.resolve(getCampaignIntelligenceForEventsFromRaw(eventsForRaw, raw)),
      getMemoryHintsForEvents(eventsForRaw),
    ]);

  const weekEndStr = addDaysToDateOnly(today, 7);
  const weekEvents = upcomingCampaignEvents.filter(
    (event) =>
      event.date >= today &&
      event.date <= weekEndStr &&
      isCampaignPageStrategy(event.communicationStrategy),
  );

  return buildTodayPageData({
    today,
    firstName,
    planningItems,
    events: upcomingCampaignEvents,
    weekEvents,
    stepsByEventId,
    intelligenceByEventId,
    memoryHintsByEventId,
  });
}
