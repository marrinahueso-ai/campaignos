import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { mapEventRow, mapEventRows } from "@/lib/events/mappers";
import { addDaysToDateOnly, getTodayDateString } from "@/lib/utils/dates";
import type { Event, EventRow } from "@/types";

export async function getUpcomingEvents(limit = 5): Promise<Event[]> {
  const supabase = await createClient();
  const today = getTodayDateString();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", today)
    .neq("status", "archived")
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
): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch events in date range:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]);
}

export async function getEventsInNextDays(days = 7): Promise<Event[]> {
  const supabase = await createClient();
  const today = getTodayDateString();
  const endDate = addDaysToDateOnly(today, days);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .gte("date", today)
    .lte("date", endDate)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch events in date range:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]);
}

export async function getActiveEvents(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch active events:", error.message);
    return [];
  }

  return mapEventRows((data ?? []) as EventRow[]);
}

export async function getAllEvents(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
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

  return mapEventRow(data as EventRow);
});
