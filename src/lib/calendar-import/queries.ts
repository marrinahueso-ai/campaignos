import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapCalendarImportRow } from "@/lib/organizations/mappers";
import { buildCalendarEventDedupeKeySet } from "@/lib/calendar-import/event-dedup";
import {
  getCalendarPlanningWindow,
  resolveCalendarSchoolYearLabel,
} from "@/lib/calendar-import/calendar-window";
import { resolveOrganizationCalendarWindowScope } from "@/lib/calendar-import/calendar-window-scope";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import { getOrganizationSchoolYearIds } from "@/lib/events/org-scope";
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

export {
  getCalendarWindowEventCount,
  getCalendarWindowEventIds,
} from "@/lib/calendar-import/calendar-window-scope";

export async function getSchoolYearCalendarEventCount(
  schoolYearId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("school_year_id", schoolYearId)
    .neq("status", "archived");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getExistingCalendarEventKeysForSchoolYear(
  schoolYearId: string,
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("title, date")
    .eq("school_year_id", schoolYearId)
    .neq("status", "archived");

  if (error || !data) {
    return new Set();
  }

  return buildCalendarEventDedupeKeySet(
    data.map((row) => ({
      title: row.title as string,
      date: row.date as string,
    })),
  );
}

export async function getSchoolYearCalendarEventsForDedup(
  schoolYearId: string,
): Promise<{ title: string; date: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("title, date")
    .eq("school_year_id", schoolYearId)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    title: row.title as string,
    date: row.date as string,
  }));
}

/** Events currently on the calendar — used for import dedup. */
export async function getCalendarWindowEventsForDedup(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<{ title: string; date: string }[]> {
  const scope = await resolveOrganizationCalendarWindowScope(
    schoolYearLabel,
    organizationId,
  );
  if (!scope) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("title, date")
    .gte("date", scope.window.startDate)
    .lte("date", scope.window.endDate)
    .neq("status", "archived")
    .in("school_year_id", scope.schoolYearIds)
    .order("date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    title: row.title as string,
    date: row.date as string,
  }));
}

export async function getExistingCalendarEventKeysForWindow(
  schoolYearLabel: string | null | undefined,
): Promise<Set<string>> {
  const events = await getCalendarWindowEventsForDedup(schoolYearLabel);
  return buildCalendarEventDedupeKeySet(
    events.map((event) => ({ title: event.title, date: event.date })),
  );
}

export async function getImportedEventsForCalendarList(): Promise<{
  filename: string | null;
  events: CalendarImportedEventListItem[];
}> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { filename: null, events: [] };
  }

  const activeSchoolYear = await getActiveSchoolYear(organization.id);
  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYear?.label,
    organizationSchoolYear: organization.schoolYear,
  });

  if (!activeSchoolYear) {
    return { filename: schoolYearLabel, events: [] };
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(organization.id);
  if (!schoolYearIds.length) {
    return { filename: schoolYearLabel, events: [] };
  }

  const window = getCalendarPlanningWindow(schoolYearLabel);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, category, communication_strategy")
    .gte("date", window.startDate)
    .lte("date", window.endDate)
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error || !data) {
    return { filename: schoolYearLabel, events: [] };
  }

  const { parseCommunicationStrategy } = await import(
    "@/lib/events/communication-strategy"
  );

  return {
    filename: schoolYearLabel,
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
