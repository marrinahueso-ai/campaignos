import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getAuthUser } from "@/lib/auth/queries";
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

  const [authUser, membership, supabase] = await Promise.all([
    getAuthUser(),
    getActiveMembership(),
    createClient(),
  ]);

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

  const currentUserEmail = authUser?.email ?? membership?.user.email ?? null;
  const currentUserDisplayName = authUser?.displayName ?? null;

  return resolveTodayGreetingName({
    currentUser: currentUserEmail
      ? {
          displayName: currentUserDisplayName,
          email: currentUserEmail,
        }
      : null,
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

  const [yearText, monthText] = today.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const monthStart =
    year && month
      ? `${year}-${String(month).padStart(2, "0")}-01`
      : today;
  const monthLastDay =
    year && month ? new Date(year, month, 0).getDate() : 28;
  const monthEnd =
    year && month
      ? `${year}-${String(month).padStart(2, "0")}-${String(monthLastDay).padStart(2, "0")}`
      : addDaysToDateOnly(today, 7);

  const [upcomingCampaignEvents, eventsInWindow, monthEvents, firstName] =
    await Promise.all([
      getUpcomingEvents(UPCOMING_CAMPAIGN_LIMIT, resolvedOrganization?.id ?? null),
      getEventsInDateRange(
        todayWindow.startDate,
        todayWindow.endDate,
        resolvedOrganization?.id ?? null,
      ),
      getEventsInDateRange(
        monthStart,
        monthEnd,
        resolvedOrganization?.id ?? null,
      ),
      getTodayGreetingName(resolvedOrganization),
    ]);

  const eventsForRaw = mergeEventsById(upcomingCampaignEvents, eventsInWindow);
  const eventIds = eventsForRaw.map((event) => event.id);

  // Memory hints only need event list (prior runs) — overlap with planning raw fetch.
  const [raw, memoryHintsByEventId] = await Promise.all([
    fetchPlanningRawDataForEvents(eventIds),
    getMemoryHintsForEvents(eventsForRaw),
  ]);
  const planningItems = buildPlanningItemsFromRaw(raw, TODAY_PLANNING_ITEM_OPTIONS);
  const stepsByEventId = buildStepsByEventIdFromRaw(raw, eventIds);
  const intelligenceByEventId = getCampaignIntelligenceForEventsFromRaw(
    eventsForRaw,
    raw,
  );

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
    monthEvents,
    weekEvents,
    stepsByEventId,
    intelligenceByEventId,
    memoryHintsByEventId,
  });
}
