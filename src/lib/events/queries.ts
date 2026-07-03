import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { mapEventRow, mapEventRows } from "@/lib/events/mappers";
import {
  getOrganizationSchoolYearIds,
  resolveScopedOrganizationId,
} from "@/lib/events/org-scope";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { Event, EventRow } from "@/types";

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

  return mapEventRows((data ?? []) as EventRow[]);
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

  return mapEventRows((data ?? []) as EventRow[]);
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

  return mapEventRows((data ?? []) as EventRow[]);
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

  return mapEventRows((data ?? []) as EventRow[]);
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

  return mapEventRows((data ?? []) as EventRow[]);
}

export const getEventById = cache(async (id: string): Promise<Event | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const schoolYearIds = await scopedSchoolYearIds(undefined);
  if (!schoolYearIds?.length) {
    return null;
  }

  const row = data as EventRow & { school_year_id?: string | null };
  if (!row.school_year_id || !schoolYearIds.includes(row.school_year_id)) {
    return null;
  }

  return mapEventRow(row);
});
