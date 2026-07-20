import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { mapCalendarImportRow } from "@/lib/organizations/mappers";
import { toEventInsert } from "@/lib/events/mappers";
import { mapEventRow } from "@/lib/events/mappers";
import { assignPlaybookToEvent } from "@/lib/playbooks/mutations";
import { shouldAssignPlaybook } from "@/lib/events/communication-strategy";
import { getTodayDateString } from "@/lib/utils/dates";
import type { CalendarImport, CalendarImportRow, CreateEventInput, Event, EventRow } from "@/types";
import type { CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import { inferEventTypeFromTitle } from "@/lib/events/event-type-inference";
import {
  buildCalendarEventDedupeKeySet,
  filterDuplicateReviewEvents,
} from "@/lib/calendar-import/event-dedup";
import {
  getOrganizationSchoolYearIds,
  resolveScopedOrganizationId,
} from "@/lib/events/org-scope";
import { getCalendarWindowEventIds } from "@/lib/calendar-import/calendar-window-scope";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";

const CALENDAR_UPLOADS_BUCKET = "calendar-uploads";

async function resolveDbClient(
  client?: SupabaseClient,
): Promise<SupabaseClient> {
  return client ?? (await createClient());
}

export async function updateCalendarImportParseStatus(
  importId: string,
  patch: {
    parseStatus: CalendarImport["parseStatus"];
    parseError?: string | null;
    extractedText?: string | null;
    parsedEvents?: CalendarReviewEvent[] | null;
    importedAt?: string | null;
  },
  client?: SupabaseClient,
): Promise<boolean> {
  const supabase = await resolveDbClient(client);

  const { error } = await supabase
    .from("calendar_imports")
    .update({
      parse_status: patch.parseStatus,
      ...(patch.parseError !== undefined && { parse_error: patch.parseError }),
      ...(patch.extractedText !== undefined && {
        extracted_text: patch.extractedText,
      }),
      ...(patch.parsedEvents !== undefined && {
        parsed_events: patch.parsedEvents,
      }),
      ...(patch.importedAt !== undefined && { imported_at: patch.importedAt }),
    })
    .eq("id", importId);

  if (error) {
    console.error("Failed to update calendar import:", error.message);
    return false;
  }

  return true;
}

export async function saveCalendarReviewEvents(
  importId: string,
  events: CalendarReviewEvent[],
): Promise<boolean> {
  return updateCalendarImportParseStatus(importId, {
    parseStatus: "parsed",
    parsedEvents: events,
    parseError: null,
  });
}

export async function insertImportedEvents(
  events: CalendarReviewEvent[],
  calendarImportId: string,
  existingKeys?: Set<string>,
  client?: SupabaseClient,
): Promise<{ events: Event[]; skippedCount: number }> {
  if (events.length === 0) {
    return { events: [], skippedCount: 0 };
  }

  const supabase = await resolveDbClient(client);
  const today = getTodayDateString();
  const organizationId = await getImportOrganizationId(
    calendarImportId,
    supabase,
  );
  const activeSchoolYear = organizationId
    ? client
      ? await getActiveSchoolYearViaClient(organizationId, supabase)
      : await getActiveSchoolYear(organizationId)
    : null;

  let dedupeKeys = existingKeys;
  if (!dedupeKeys && activeSchoolYear) {
    const { data: existingRows } = await supabase
      .from("events")
      .select("title, date")
      .eq("school_year_id", activeSchoolYear.id)
      .neq("status", "archived");

    dedupeKeys = buildCalendarEventDedupeKeySet(
      (existingRows ?? []).map((row) => ({
        title: row.title as string,
        date: row.date as string,
      })),
    );
  }

  const { newEvents, skippedCount } = filterDuplicateReviewEvents(
    events,
    dedupeKeys ?? new Set(),
  );

  if (newEvents.length === 0) {
    return { events: [], skippedCount };
  }

  const rows = newEvents.map((event) => {
    const input: CreateEventInput = {
      title: event.name,
      description: `Imported from school calendar (${event.category}).`,
      date: event.date,
      time: null,
      location: null,
      audience: null,
      theme: null,
      status: event.date >= today ? "scheduled" : "draft",
      eventType:
        event.eventType ?? inferEventTypeFromTitle(event.name, event.category),
      communicationStrategy: event.communicationStrategy,
      calendarImportId,
      category: event.category,
    };

    return toEventInsert(input);
  }).map((row) => ({
    ...row,
    ...(activeSchoolYear && { school_year_id: activeSchoolYear.id }),
  }));

  const { data, error } = await supabase.from("events").insert(rows).select("*");

  if (error || !data) {
    console.error("Failed to insert imported events:", error?.message);
    return { events: [], skippedCount };
  }

  const inserted = (data as EventRow[]).map(mapEventRow);

  for (const event of inserted) {
    if (shouldAssignPlaybook(event.communicationStrategy)) {
      await assignPlaybookToEvent(event, undefined, organizationId);
    }

    await supabase.from("activity_log").insert({
      event_id: event.id,
      activity_type: "calendar_imported",
      title: "Added from school calendar",
      description: `Imported as ${event.category ?? "school event"}.`,
      occurred_at: new Date().toISOString(),
    });
  }

  return { events: inserted, skippedCount };
}

async function getImportOrganizationId(
  calendarImportId: string,
  client?: SupabaseClient,
): Promise<string | null> {
  const supabase = await resolveDbClient(client);
  const { data } = await supabase
    .from("calendar_imports")
    .select("organization_id")
    .eq("id", calendarImportId)
    .maybeSingle();

  return (data?.organization_id as string | undefined) ?? null;
}

async function getActiveSchoolYearViaClient(
  organizationId: string,
  supabase: SupabaseClient,
): Promise<{ id: string } | null> {
  const { data: org } = await supabase
    .from("organizations")
    .select("active_school_year_id")
    .eq("id", organizationId)
    .maybeSingle();

  const schoolYearId = org?.active_school_year_id as string | null | undefined;
  if (!schoolYearId) {
    return null;
  }

  const { data } = await supabase
    .from("school_years")
    .select("id")
    .eq("id", schoolYearId)
    .maybeSingle();

  return data ? { id: data.id as string } : null;
}

export async function deleteEventsByIds(
  ids: string[],
  organizationId?: string | null,
): Promise<{ ok: boolean; deletedCount: number }> {
  if (ids.length === 0) {
    return { ok: true, deletedCount: 0 };
  }

  const scopedOrgId = await resolveScopedOrganizationId(organizationId);
  if (!scopedOrgId) {
    return { ok: false, deletedCount: 0 };
  }

  const schoolYearIds = await getOrganizationSchoolYearIds(scopedOrgId);
  if (!schoolYearIds.length) {
    return { ok: false, deletedCount: 0 };
  }

  const supabase = await createClient();
  const { data: scopedRows, error: scopeError } = await supabase
    .from("events")
    .select("id")
    .in("id", ids)
    .in("school_year_id", schoolYearIds);

  if (scopeError) {
    console.error("Failed to scope events for delete:", scopeError.message);
    return { ok: false, deletedCount: 0 };
  }

  const scopedIds = (scopedRows ?? []).map((row) => row.id as string);
  if (scopedIds.length === 0) {
    return { ok: false, deletedCount: 0 };
  }

  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .in("id", scopedIds);

  if (error) {
    console.error("Failed to bulk delete events:", error.message);
    return { ok: false, deletedCount: 0 };
  }

  return { ok: true, deletedCount: count ?? scopedIds.length };
}

export async function deleteEventsForCalendarImport(
  calendarImportId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("calendar_import_id", calendarImportId);

  if (error) {
    console.error("Failed to delete imported calendar events:", error.message);
    return false;
  }

  return true;
}

export async function deleteEventsForSchoolYear(
  schoolYearId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("school_year_id", schoolYearId);

  if (error) {
    console.error("Failed to delete school year calendar events:", error.message);
    return false;
  }

  return true;
}

/** Delete every event currently visible on the calendar (planning window) for this org. */
export async function deleteCalendarWindowEvents(
  schoolYearLabel: string | null | undefined,
  organizationId?: string | null,
): Promise<{ ok: boolean; deletedCount: number }> {
  const organization = organizationId
    ? { id: organizationId }
    : await getLatestOrganization();
  if (!organization) {
    return { ok: false, deletedCount: 0 };
  }

  const eventIds = await getCalendarWindowEventIds(schoolYearLabel, organization.id);
  if (eventIds.length === 0) {
    return { ok: true, deletedCount: 0 };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("events")
    .delete({ count: "exact" })
    .in("id", eventIds);

  if (error) {
    console.error("Failed to delete calendar window events:", error.message);
    return { ok: false, deletedCount: 0 };
  }

  return { ok: true, deletedCount: count ?? eventIds.length };
}

export async function resetAllCalendarImportsForOrganization(
  organizationId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("calendar_imports")
    .update({
      parse_status: "parsed",
      imported_at: null,
    })
    .eq("organization_id", organizationId)
    .eq("parse_status", "imported");
}

export async function resetCalendarImportsForSchoolYear(
  schoolYearId: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("calendar_imports")
    .update({
      parse_status: "parsed",
      imported_at: null,
    })
    .eq("school_year_id", schoolYearId)
    .eq("parse_status", "imported");
}

export async function updateEventCommunicationStrategy(
  eventId: string,
  strategy: CommunicationStrategy,
): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .update({
      communication_strategy: strategy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to update communication strategy:", error?.message);
    return null;
  }

  return mapEventRow(data as EventRow);
}

export async function uploadCalendarImportFile(
  organizationId: string,
  file: File,
): Promise<{ importRecord: CalendarImport | null; error: string | null }> {
  const supabase = await createClient();
  const extension = file.name.split(".").pop()?.toLowerCase();

  let fileType: string | null = null;
  switch (extension) {
    case "pdf":
      fileType = "pdf";
      break;
    case "docx":
      fileType = "docx";
      break;
    case "xlsx":
    case "xls":
      fileType = "excel";
      break;
    case "csv":
      fileType = "csv";
      break;
    case "ics":
      fileType = "ics";
      break;
    default:
      return {
        importRecord: null,
        error: "Calendar file must be PDF, Word (.docx), Excel, CSV, or ICS.",
      };
  }

  const storagePath = `${organizationId}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CALENDAR_UPLOADS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload calendar file:", uploadError.message);
    return {
      importRecord: null,
      error: "Unable to upload calendar file. Please try again.",
    };
  }

  const { data, error } = await supabase
    .from("calendar_imports")
    .insert({
      organization_id: organizationId,
      filename: file.name,
      file_type: fileType,
      upload_status: "uploaded",
      storage_path: storagePath,
      parse_status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to save calendar import:", error?.message);
    return {
      importRecord: null,
      error: "Unable to save calendar upload. Please try again.",
    };
  }

  return {
    importRecord: mapCalendarImportRow(data as CalendarImportRow),
    error: null,
  };
}

export async function createCalendarImportFromIcsText(
  organizationId: string,
  icsText: string,
  filename: string,
  client?: SupabaseClient,
): Promise<{ importRecord: CalendarImport | null; error: string | null }> {
  const supabase = await resolveDbClient(client);
  const safeFilename = filename.trim() || "calendar-subscribe.ics";
  const storagePath = `${organizationId}/${Date.now()}-${safeFilename}`;
  const buffer = Buffer.from(icsText, "utf-8");

  const { error: uploadError } = await supabase.storage
    .from(CALENDAR_UPLOADS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: "text/calendar",
      upsert: true,
    });

  if (uploadError) {
    console.error("Failed to upload ICS calendar feed:", uploadError.message);
    return {
      importRecord: null,
      error: "Unable to save calendar feed. Please try again.",
    };
  }

  const { data, error } = await supabase
    .from("calendar_imports")
    .insert({
      organization_id: organizationId,
      filename: safeFilename,
      file_type: "ics",
      upload_status: "uploaded",
      storage_path: storagePath,
      parse_status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to save calendar import from feed:", error?.message);
    return {
      importRecord: null,
      error: "Unable to save calendar feed import. Please try again.",
    };
  }

  return {
    importRecord: mapCalendarImportRow(data as CalendarImportRow),
    error: null,
  };
}
