import {
  canAccessEvent,
  filterEventsByAccess,
  getEffectiveAccess,
  type EffectiveAccess,
} from "@/lib/access-templates/effective-access";
import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { mapEventRow, mapEventRows } from "@/lib/events/mappers";
import {
  getOrganizationSchoolYearIds,
  resolveScopedOrganizationId,
} from "@/lib/events/org-scope";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { Event, EventRow } from "@/types";

async function applyAssignedEventsFilter(events: Event[]): Promise<Event[]> {
  const access = await getEffectiveAccess();
  return filterEventsByAccess(access, events);
}

async function scopedSchoolYearIds(
  organizationId?: string | null,
): Promise<string[] | null> {
  const scopedOrgId = await resolveScopedOrganizationId(organizationId);
  if (!scopedOrgId) {
    return null;
  }

  return getOrganizationSchoolYearIds(scopedOrgId);
}

export async function getUpcomingEvents(
  limit = 5,
  organizationId?: string | null,
): Promise<Event[]> {
  const schoolYearIds = await scopedSchoolYearIds(organizationId);
  if (!schoolYearIds?.length) {
    return [];
  }

  const supabase = await createClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", today)
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch upcoming events:", error.message);
    return [];
  }

  return applyAssignedEventsFilter(mapEventRows((data ?? []) as EventRow[]));
}

export async function getEventsInDateRange(
  startDate: string,
  endDate: string,
  organizationId?: string | null,
): Promise<Event[]> {
  const schoolYearIds = await scopedSchoolYearIds(organizationId);
  if (!schoolYearIds?.length) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch events in date range:", error.message);
    return [];
  }

  return applyAssignedEventsFilter(mapEventRows((data ?? []) as EventRow[]));
}

export async function getEventsInNextDays(
  days = 7,
  organizationId?: string | null,
): Promise<Event[]> {
  const schoolYearIds = await scopedSchoolYearIds(organizationId);
  if (!schoolYearIds?.length) {
    return [];
  }

  const supabase = await createClient();
  const today = getTodayDateString();
  const endDate = addDaysToDateOnly(today, days);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", today)
    .lte("date", endDate)
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch events in date range:", error.message);
    return [];
  }

  return applyAssignedEventsFilter(mapEventRows((data ?? []) as EventRow[]));
}

export async function getActiveEvents(
  organizationId?: string | null,
): Promise<Event[]> {
  const schoolYearIds = await scopedSchoolYearIds(organizationId);
  if (!schoolYearIds?.length) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch active events:", error.message);
    return [];
  }

  return applyAssignedEventsFilter(mapEventRows((data ?? []) as EventRow[]));
}

export async function getAllEvents(
  organizationId?: string | null,
): Promise<Event[]> {
  const schoolYearIds = await scopedSchoolYearIds(organizationId);
  if (!schoolYearIds?.length) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch events:", error.message);
    return [];
  }

  return applyAssignedEventsFilter(mapEventRows((data ?? []) as EventRow[]));
}

export const getEventById = cache(async (id: string): Promise<Event | null> => {
  const supabase = await createClient();

  // Overlap event fetch with school-year scope — sequential was adding a
  // full round-trip on every event page (including Create with AI).
  const [eventResult, schoolYearIds, access] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).single(),
    scopedSchoolYearIds(undefined),
    getEffectiveAccess(),
  ]);

  const { data, error } = eventResult;
  if (error || !data) {
    return null;
  }

  if (!schoolYearIds?.length) {
    return null;
  }

  const row = data as EventRow & { school_year_id?: string | null };
  if (!row.school_year_id || !schoolYearIds.includes(row.school_year_id)) {
    return null;
  }

  // Assigned-only members must not load unassigned events by id (IDOR).
  if (access && !canAccessEvent(access, id)) {
    return null;
  }

  return mapEventRow(row);
});

/**
 * Event-scoped gate for mutations/pages that take eventId.
 * Wraps getEventById (org scope + assigned-only EffectiveAccess).
 */
export async function requireEventAccess(
  eventId: string,
): Promise<{ event: Event; access: EffectiveAccess | null } | { error: string }> {
  const [event, access] = await Promise.all([
    getEventById(eventId),
    getEffectiveAccess(),
  ]);

  if (!event) {
    return { error: "Event not found or you do not have access." };
  }

  return { event, access };
}
