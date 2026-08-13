import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { mapCalendarImportRow } from "@/lib/organizations/mappers";
import {
  buildCalendarEventDedupeKeySet,
  type ExistingCalendarEventForDedup,
} from "@/lib/calendar-import/event-dedup";
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
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
import {
  applyPlaybookDefaultsToReviewEvents,
  type ReviewPlaybookOption,
} from "@/lib/calendar-import/review-plan-options";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
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
  organizationId?: string,
): Promise<CalendarImport | null> {
  const organization = organizationId
    ? { id: organizationId }
    : await getLatestOrganization();
  if (!organization) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_imports")
    .select("*")
    .eq("id", importId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCalendarImportRow(data as CalendarImportRow);
}

export const getCalendarReviewPageData = cache(async (
  importId?: string | null,
): Promise<{
  importRecord: CalendarImport | null;
  reviewData: CalendarReviewData | null;
  importedEventCount: number;
  playbookOptions: ReviewPlaybookOption[];
  hasPriorImportedCalendar: boolean;
}> => {
  const importRecord = importId?.trim()
    ? await getCalendarImportById(importId.trim())
    : await getLatestCalendarImport();

  if (!importRecord) {
    return {
      importRecord: null,
      reviewData: null,
      importedEventCount: 0,
      playbookOptions: [],
      hasPriorImportedCalendar: false,
    };
  }

  const playbooks = await getPlaybooksForOrganization(
    importRecord.organizationId,
  );
  const playbookOptions: ReviewPlaybookOption[] = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    eventType: playbook.eventType,
    stepCount: playbook.stepCount,
  }));

  const rawEvents = parseRawReviewEvents(importRecord.parsedEvents);
  const events = applyPlaybookDefaultsToReviewEvents(
    parseStoredReviewEvents(importRecord.parsedEvents),
    playbookOptions,
  );

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
  const [{ count }, priorImport] = await Promise.all([
    supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("calendar_import_id", importRecord.id),
    supabase
      .from("calendar_imports")
      .select("id")
      .eq("organization_id", importRecord.organizationId)
      .eq("parse_status", "imported")
      .neq("id", importRecord.id)
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    importRecord,
    reviewData,
    importedEventCount: count ?? 0,
    playbookOptions,
    hasPriorImportedCalendar: Boolean(priorImport.data),
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

function mapDedupRows(
  data: {
    id?: string;
    title: string;
    date: string;
    time?: string | null;
    location?: string | null;
    import_source?: string | null;
    import_external_id?: string | null;
  }[],
): ExistingCalendarEventForDedup[] {
  return data.map((row) => ({
    id: (row.id as string | undefined) ?? "",
    title: row.title as string,
    date: row.date as string,
    time: (row.time as string | null | undefined) ?? null,
    location: (row.location as string | null | undefined) ?? null,
    importSource: (row.import_source as string | null | undefined) ?? null,
    importExternalId:
      (row.import_external_id as string | null | undefined) ?? null,
  }));
}

export async function getSchoolYearCalendarEventsForDedup(
  schoolYearId: string,
): Promise<ExistingCalendarEventForDedup[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, time, location, import_source, import_external_id")
    .eq("school_year_id", schoolYearId)
    .neq("status", "archived")
    .order("date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return mapDedupRows(data as Parameters<typeof mapDedupRows>[0]);
}

/** Events currently on the calendar — used for import dedup. */
export async function getCalendarWindowEventsForDedup(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<ExistingCalendarEventForDedup[]> {
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
    .select("id, title, date, time, location, import_source, import_external_id")
    .gte("date", scope.window.startDate)
    .lte("date", scope.window.endDate)
    .neq("status", "archived")
    .in("school_year_id", scope.schoolYearIds)
    .order("date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return mapDedupRows(data as Parameters<typeof mapDedupRows>[0]);
}

export async function getSchoolYearEventsForDedupViaClient(
  schoolYearId: string,
  supabase: SupabaseClient,
): Promise<ExistingCalendarEventForDedup[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, time, location, import_source, import_external_id")
    .eq("school_year_id", schoolYearId)
    .neq("status", "archived");

  if (error || !data) {
    return [];
  }

  return mapDedupRows(data as Parameters<typeof mapDedupRows>[0]);
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
  playbookOptions: ReviewPlaybookOption[];
}> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { filename: null, events: [], playbookOptions: [] };
  }

  const [activeSchoolYear, playbooks] = await Promise.all([
    getActiveSchoolYear(organization.id),
    getPlaybooksForOrganization(organization.id),
  ]);
  const playbookOptions: ReviewPlaybookOption[] = playbooks.map((playbook) => ({
    id: playbook.id,
    name: playbook.name,
    eventType: playbook.eventType,
    stepCount: playbook.stepCount,
  }));
  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYear?.label,
    organizationSchoolYear: organization.schoolYear,
  });

  if (!activeSchoolYear) {
    return { filename: schoolYearLabel, events: [], playbookOptions };
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(organization.id);
  if (!schoolYearIds.length) {
    return { filename: schoolYearLabel, events: [], playbookOptions };
  }

  // Import list is cleanup/manage scope: every non-archived event for the org's
  // school years — same membership as Events — not the rolling calendar date window.
  // Date-window clipping hid misdated imports (e.g. July 30 prior year) so they
  // remained on Events after "delete" from a list that never showed them.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, title, date, time, category, communication_strategy, import_source")
    .neq("status", "archived")
    .in("school_year_id", schoolYearIds)
    .order("date", { ascending: true });

  if (error || !data) {
    return { filename: schoolYearLabel, events: [], playbookOptions };
  }

  const eventIds = data.map((row) => row.id as string);
  const playbookByEventId = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: assignments } = await supabase
      .from("event_playbook_assignments")
      .select("event_id, playbook_id")
      .in("event_id", eventIds);
    for (const row of assignments ?? []) {
      playbookByEventId.set(
        row.event_id as string,
        row.playbook_id as string,
      );
    }
  }

  const { parseCommunicationStrategy } = await import(
    "@/lib/events/communication-strategy"
  );

  return {
    filename: schoolYearLabel,
    playbookOptions,
    events: data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      date: row.date as string,
      time: (row.time as string | null) ?? null,
      category: (row.category as string | null) ?? null,
      communicationStrategy: parseCommunicationStrategy(
        row.communication_strategy as string,
      ),
      playbookId: playbookByEventId.get(row.id as string) ?? null,
      importSource: (row.import_source as string | null) ?? null,
    })),
  };
}
