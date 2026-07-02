"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractCalendarFileText } from "@/lib/calendar-import/extract-text";
import {
  deleteEventsByIds,
  deleteEventsForCalendarImport,
  insertImportedEvents,
  saveCalendarReviewEvents,
  updateCalendarImportParseStatus,
  updateEventCommunicationStrategy,
  uploadCalendarImportFile,
} from "@/lib/calendar-import/mutations";
import {
  parseCalendarTextWithAi,
  refineCalendarEventsWithAi,
  mapParsedEvents,
} from "@/lib/calendar-import/parse-events";
import { countDateMentions, mergeRawEvents } from "@/lib/calendar-import/extract-date-lines";
import { generateText } from "@/lib/ai/provider";
import {
  getCalendarImportById,
  getLatestCalendarImport,
} from "@/lib/calendar-import/queries";
import { initializeEventWorkspace } from "@/lib/event-workspace/mutations";
import { revalidateEventPaths } from "@/lib/event-workspace/revalidate-event-paths";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { assignPlaybookToEvent } from "@/lib/playbooks/mutations";
import {
  applyImportPreferencesToEvents,
  getImportEventPreferencesMap,
  upsertImportPreferencesFromReviewEvents,
} from "@/lib/calendar-import/import-preferences";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import { linkCalendarImportToSchoolYear } from "@/lib/school-years/mutations";
import type { CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";

export type CalendarImportActionState = {
  error: string | null;
  success: boolean;
};

function revalidateCalendarPaths() {
  revalidatePath("/calendar");
  revalidatePath("/calendar/review");
  revalidatePath("/calendar/import");
  revalidatePath("/dashboard");
  revalidatePath("/events");
}

export async function parseCalendarImportAction(
  importId: string,
): Promise<{ events: CalendarReviewEvent[]; error: string | null }> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return { events: [], error: "Calendar upload not found." };
  }

  if (importRecord.parseStatus === "imported") {
    return {
      events: [],
      error: "This calendar has already been imported.",
    };
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsing",
    parseError: null,
  });

  const extracted = await extractCalendarFileText(
    importRecord.fileType,
    importRecord.storagePath,
  );

  if (!extracted.text) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "failed",
      parseError: extracted.error,
    });
    return { events: [], error: extracted.error };
  }

  const organization = await getLatestOrganization();
  const parsed = await parseCalendarTextWithAi(
    extracted.text,
    organization?.schoolYear,
  );

  if (!parsed.events.length) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "failed",
      parseError: parsed.error,
      extractedText: extracted.text,
    });
    return { events: [], error: parsed.error };
  }

  let events = parsed.events;
  if (organization) {
    const preferences = await getImportEventPreferencesMap(organization.id);
    events = applyImportPreferencesToEvents(events, preferences);
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsed",
    parseError: null,
    extractedText: extracted.text,
    parsedEvents: events,
  });

  revalidateCalendarPaths();
  return { events, error: null };
}

export async function saveCalendarReviewEventsAction(
  importId: string,
  events: CalendarReviewEvent[],
): Promise<CalendarImportActionState> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return { error: "Calendar upload not found.", success: false };
  }

  if (importRecord.parseStatus === "imported") {
    return { error: "This calendar has already been imported.", success: false };
  }

  const saved = await saveCalendarReviewEvents(importId, events);

  if (!saved) {
    return { error: "Unable to save review changes.", success: false };
  }

  revalidateCalendarPaths();
  return { error: null, success: true };
}

export async function refineCalendarReviewAction(
  importId: string,
  events: CalendarReviewEvent[],
  userMessage: string,
): Promise<{ events: CalendarReviewEvent[]; error: string | null }> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return { events, error: "Calendar upload not found." };
  }

  const message = userMessage.trim();
  if (!message) {
    return { events, error: "Enter a message describing what to fix." };
  }

  const text = importRecord.extractedText ?? "";
  const refined = await refineCalendarEventsWithAi(text, events, message);

  if (refined.error) {
    return { events, error: refined.error };
  }

  await saveCalendarReviewEvents(importId, refined.events);
  revalidateCalendarPaths();
  return { events: refined.events, error: null };
}

export async function importCalendarEventsAction(
  importId: string,
  events: CalendarReviewEvent[],
): Promise<{ importedCount: number; error: string | null }> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return { importedCount: 0, error: "Calendar upload not found." };
  }

  if (importRecord.parseStatus === "imported") {
    return { importedCount: 0, error: "This calendar has already been imported." };
  }

  if (events.length === 0) {
    return { importedCount: 0, error: "No events selected to import." };
  }

  const inserted = await insertImportedEvents(events, importId);

  if (!inserted.length) {
    return {
      importedCount: 0,
      error: "Unable to import events. Please try again.",
    };
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "imported",
    parseError: null,
    parsedEvents: events,
    importedAt: new Date().toISOString(),
  });

  const organization = await getLatestOrganization();
  if (organization) {
    await upsertImportPreferencesFromReviewEvents(organization.id, events);
  }

  revalidateCalendarPaths();
  return { importedCount: inserted.length, error: null };
}

export async function deleteImportedCalendarEventsAction(
  importId: string,
): Promise<CalendarImportActionState> {
  const deleted = await deleteEventsForCalendarImport(importId);

  if (!deleted) {
    return { error: "Unable to delete imported events.", success: false };
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsed",
    importedAt: null,
  });

  revalidateCalendarPaths();
  return { error: null, success: true };
}

export async function bulkDeleteEventsAction(
  eventIds: string[],
): Promise<CalendarImportActionState> {
  const deleted = await deleteEventsByIds(eventIds);

  if (!deleted) {
    return { error: "Unable to delete selected events.", success: false };
  }

  revalidateCalendarPaths();
  return { error: null, success: true };
}

export async function uploadCalendarFileAction(
  _prevState: CalendarImportActionState,
  formData: FormData,
): Promise<CalendarImportActionState> {
  const organization = await getLatestOrganization();

  if (!organization) {
    return {
      error: "Complete school setup before uploading a calendar.",
      success: false,
    };
  }

  const file = formData.get("calendarFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a calendar file to upload.", success: false };
  }

  const result = await uploadCalendarImportFile(organization.id, file);

  if (!result.importRecord) {
    return { error: result.error ?? "Upload failed.", success: false };
  }

  const activeSchoolYear = await getActiveSchoolYear(organization.id);
  if (activeSchoolYear) {
    await linkCalendarImportToSchoolYear(result.importRecord.id, activeSchoolYear.id);
  }

  revalidateCalendarPaths();
  redirect(`/calendar/review?import=${result.importRecord.id}`);
}

export async function upgradeEventToCampaignAction(
  eventId: string,
  strategy: Extract<CommunicationStrategy, "full_campaign" | "reminder_only">,
): Promise<CalendarImportActionState> {
  const event = await getEventById(eventId);

  if (!event) {
    return { error: "Event not found.", success: false };
  }

  if (event.communicationStrategy !== "calendar_only") {
    return { error: null, success: true };
  }

  const updated = await updateEventCommunicationStrategy(eventId, strategy);

  if (!updated) {
    return { error: "Unable to start a campaign for this event.", success: false };
  }

  const organization = await getLatestOrganization();
  await assignPlaybookToEvent(updated, undefined, organization?.id ?? null);
  await initializeEventWorkspace(updated);

  revalidatePath(`/events/${eventId}`);
  revalidateEventPaths(eventId);
  revalidateCalendarPaths();
  return { error: null, success: true };
}

export async function findMissingCalendarEventsAction(
  importId: string,
  currentEvents: CalendarReviewEvent[],
): Promise<{ events: CalendarReviewEvent[]; error: string | null }> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord?.extractedText) {
    return {
      events: currentEvents,
      error: "Re-upload the calendar to search for missing events.",
    };
  }

  const organization = await getLatestOrganization();
  const text = importRecord.extractedText;
  const expectedDates = countDateMentions(text);

  const result = await generateText({
    systemPrompt: `You find dated school calendar entries that were missed in a first pass.

Return ONLY valid JSON:
{
  "events": [
    { "name": "Event name", "date": "2025-09-01", "category": "School Event", "status": "ready" }
  ]
}

Include ONLY events that are in the document but NOT in the existing list.`,
    userPrompt: `School year: ${organization?.schoolYear ?? "unknown"}
Document date mentions detected: about ${expectedDates}
Existing parsed events (${currentEvents.length}):
${JSON.stringify(
  currentEvents.map((event) => ({ name: event.name, date: event.date })),
  null,
  2,
)}

Document text:
${text.slice(0, 80_000)}

Return every missing dated event.`,
    maxTokens: 16_384,
    temperature: 0.05,
    jsonMode: true,
  });

  if (!result.success || !result.text) {
    return {
      events: currentEvents,
      error: result.error ?? "Could not search for missing events.",
    };
  }

  let missingRaw: { name?: string; date?: string; category?: string; status?: string }[] = [];
  try {
    const parsed = JSON.parse(result.text) as {
      events?: { name?: string; date?: string; category?: string; status?: string }[];
    };
    missingRaw = parsed.events ?? [];
  } catch {
    return {
      events: currentEvents,
      error: "Could not read the missing-events response.",
    };
  }

  const mergedRaw = mergeRawEvents(
    currentEvents.map((event) => ({
      name: event.name,
      date: event.date,
      category: event.category,
      status: event.status,
    })),
    missingRaw,
  );

  const events = mapParsedEvents(mergedRaw, organization?.schoolYear);
  await saveCalendarReviewEvents(importId, events);
  revalidateCalendarPaths();

  return { events, error: null };
}

export async function ensureLatestCalendarImportAction(): Promise<{
  importId: string | null;
  parseStatus: string | null;
}> {
  const importRecord = await getLatestCalendarImport();
  return {
    importId: importRecord?.id ?? null,
    parseStatus: importRecord?.parseStatus ?? null,
  };
}
