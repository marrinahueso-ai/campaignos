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
import { getActiveSchoolYear } from "@/lib/school-years/queries";

const CALENDAR_UPLOADS_BUCKET = "calendar-uploads";

export async function updateCalendarImportParseStatus(
  importId: string,
  patch: {
    parseStatus: CalendarImport["parseStatus"];
    parseError?: string | null;
    extractedText?: string | null;
    parsedEvents?: CalendarReviewEvent[] | null;
    importedAt?: string | null;
  },
): Promise<boolean> {
  const supabase = await createClient();

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
): Promise<Event[]> {
  if (events.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const today = getTodayDateString();
  const organizationId = await getImportOrganizationId(calendarImportId);
  const activeSchoolYear = organizationId
    ? await getActiveSchoolYear(organizationId)
    : null;

  const rows = events.map((event) => {
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
    return [];
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

  return inserted;
}

async function getImportOrganizationId(
  calendarImportId: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("calendar_imports")
    .select("organization_id")
    .eq("id", calendarImportId)
    .maybeSingle();

  return (data?.organization_id as string | undefined) ?? null;
}

export async function deleteEventsByIds(ids: string[]): Promise<boolean> {
  if (ids.length === 0) {
    return true;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().in("id", ids);

  if (error) {
    console.error("Failed to bulk delete events:", error.message);
    return false;
  }

  return true;
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
