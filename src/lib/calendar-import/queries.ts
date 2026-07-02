import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapCalendarImportRow } from "@/lib/organizations/mappers";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { buildCalendarReviewStats } from "@/lib/calendar-import/stats";
import {
  parseRawReviewEvents,
  parseStoredReviewEvents,
} from "@/lib/calendar-import/parse-events";
import { saveCalendarReviewEvents } from "@/lib/calendar-import/mutations";
import { reviewEventsNeedPlanRefresh } from "@/lib/calendar-import/review-event-normalize";
import type { CalendarImport, CalendarImportRow } from "@/types";
import type { CalendarReviewData } from "@/types/calendar-review";
import type { CalendarImportedEventListItem } from "@/types/communications-calendar";

export async function getLatestCalendarImport(): Promise<CalendarImport | null> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_imports")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCalendarImportRow(data as CalendarImportRow);
}

export async function getCalendarImportById(
  importId: string,
): Promise<CalendarImport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_imports")
    .select("*")
    .eq("id", importId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCalendarImportRow(data as CalendarImportRow);
}

export const getCalendarReviewPageData = cache(async (): Promise<{
  importRecord: CalendarImport | null;
  reviewData: CalendarReviewData | null;
  importedEventCount: number;
}> => {
  const importRecord = await getLatestCalendarImport();

  if (!importRecord) {
    return {
      importRecord: null,
      reviewData: null,
      importedEventCount: 0,
    };
  }

  const rawEvents = parseRawReviewEvents(importRecord.parsedEvents);
  const events = parseStoredReviewEvents(importRecord.parsedEvents);

  if (
    rawEvents.length > 0 &&
    reviewEventsNeedPlanRefresh(rawEvents, events)
  ) {
    await saveCalendarReviewEvents(importRecord.id, events);
  }

  const reviewData: CalendarReviewData = {
    filename: importRecord.filename,
    uploadedAt: importRecord.createdAt,
    stats: buildCalendarReviewStats(events),
    events,
  };

  const supabase = await createClient();
  const { count } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("calendar_import_id", importRecord.id);

  return {
    importRecord,
    reviewData,
    importedEventCount: count ?? 0,
  };
});

export async function getImportedEventsForCalendarList(): Promise<{
  filename: string | null;
  events: CalendarImportedEventListItem[];
}> {
  const latestImport = await getLatestCalendarImport();

  if (!latestImport?.importedAt) {
    return { filename: null, events: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, category, communication_strategy")
    .eq("calendar_import_id", latestImport.id)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error || !data) {
    return { filename: latestImport.filename, events: [] };
  }

  const { parseCommunicationStrategy } = await import(
    "@/lib/events/communication-strategy"
  );

  return {
    filename: latestImport.filename,
    events: data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      date: row.date as string,
      category: (row.category as string | null) ?? null,
      communicationStrategy: parseCommunicationStrategy(
        row.communication_strategy as string,
      ),
    })),
  };
}
