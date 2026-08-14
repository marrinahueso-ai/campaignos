"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { extractCalendarFileText } from "@/lib/calendar-import/extract-text";
import {
  deleteEventsByIds,
  deleteEventsForCalendarImport,
  deleteCalendarWindowEvents,
  insertImportedEvents,
  resetAllCalendarImportsForOrganization,
  resetCalendarImportsForSchoolYear,
  saveCalendarReviewEvents,
  updateCalendarImportParseStatus,
  updateEventCommunicationStrategy,
  uploadCalendarImportFile,
} from "@/lib/calendar-import/mutations";
import {
  buildCalendarEventDedupeKeySet,
  classifyReviewEventsAgainstExisting,
  filterDuplicateReviewEvents,
} from "@/lib/calendar-import/event-dedup";
import {
  parseCalendarTextWithAi,
  refineCalendarEventsWithAi,
  mapParsedEvents,
  parseStoredReviewEvents,
} from "@/lib/calendar-import/parse-events";
import { countDateMentions } from "@/lib/calendar-import/extract-date-lines";
import { generateText } from "@/lib/ai/provider";
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
import { filterEventsToSchoolYearWindow } from "@/lib/calendar-import/school-year-event-window";
import {
  getCalendarImportById,
  getCalendarWindowEventCount,
  getExistingCalendarEventKeysForWindow,
  getLatestCalendarImport,
  getCalendarWindowEventsForDedup,
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
import { parseIcsToReviewEvents } from "@/lib/calendar-import/parse-ics";
import { normalizeCalendarReviewEvents } from "@/lib/calendar-import/review-event-normalize";
import { applyPlaybookDefaultsToReviewEvents } from "@/lib/calendar-import/review-plan-options";
import { getPlaybooksForOrganization } from "@/lib/playbooks/queries";
import { getActiveSchoolYear } from "@/lib/school-years/queries";
import { linkCalendarImportToSchoolYear } from "@/lib/school-years/mutations";
import type { CalendarReviewEvent } from "@/types/calendar-review";
import type { CommunicationStrategy } from "@/types/communication-strategy";
import {
  applySyncReviewDecision,
  type SyncReviewDecision,
} from "@/lib/calendar-import/sync-review-decisions";

export type CalendarImportActionState = {
  error: string | null;
  success: boolean;
};

function revalidateCalendarPaths() {
  revalidatePath("/calendar");
  revalidatePath("/calendar/review");
  revalidatePath("/calendar/import");
  revalidatePath("/dashboard");
  // Layout so nested /events/[id] and client navigations pick up deletes immediately.
  revalidatePath("/events", "layout");
  revalidatePath("/publishing");
  revalidatePath("/approvals");
}

async function classifyParsedEventsForReview(
  events: CalendarReviewEvent[],
  organizationId?: string | null,
  organizationSchoolYear?: string | null,
  activeSchoolYearLabel?: string | null,
): Promise<CalendarReviewEvent[]> {
  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYearLabel ?? null,
    organizationSchoolYear: organizationSchoolYear ?? null,
  });
  const existing = await getCalendarWindowEventsForDedup(
    schoolYearLabel,
    organizationId ?? null,
  );
  return classifyReviewEventsAgainstExisting(events, existing, {
    mode: "interactive",
  });
}

async function withOrgPlaybookDefaults(
  events: CalendarReviewEvent[],
  organizationId: string | null | undefined,
): Promise<CalendarReviewEvent[]> {
  const playbooks = await getPlaybooksForOrganization(organizationId ?? null);
  return applyPlaybookDefaultsToReviewEvents(
    events,
    playbooks.map((playbook) => ({
      id: playbook.id,
      name: playbook.name,
      eventType: playbook.eventType,
      stepCount: playbook.stepCount,
    })),
  );
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
  const activeSchoolYear = organization
    ? await getActiveSchoolYear(organization.id)
    : null;

  if (importRecord.fileType === "ics") {
    const schoolYearLabel =
      activeSchoolYear?.label ?? organization?.schoolYear ?? null;
    const events = filterEventsToSchoolYearWindow(
      parseIcsToReviewEvents(extracted.text, schoolYearLabel, "ics"),
      schoolYearLabel,
    );

    if (!events.length) {
      await updateCalendarImportParseStatus(importId, {
        parseStatus: "failed",
        parseError:
          "No events in this school year were found in the ICS calendar file.",
        extractedText: extracted.text,
      });
      return {
        events: [],
        error:
          "No events in this school year were found in the ICS calendar file.",
      };
    }

    let normalizedEvents = events;
    if (organization) {
      const preferences = await getImportEventPreferencesMap(organization.id);
      normalizedEvents = applyImportPreferencesToEvents(events, preferences);
    }

    normalizedEvents = await classifyParsedEventsForReview(
      normalizedEvents,
      organization?.id,
      organization?.schoolYear,
      activeSchoolYear?.label,
    );
    normalizedEvents = await withOrgPlaybookDefaults(
      normalizedEvents,
      organization?.id,
    );

    await updateCalendarImportParseStatus(importId, {
      parseStatus: "parsed",
      parseError: null,
      extractedText: extracted.text,
      parsedEvents: normalizedEvents,
    });

    revalidateCalendarPaths();
    return { events: normalizedEvents, error: null };
  }

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

  const schoolYearLabel =
    activeSchoolYear?.label ?? organization?.schoolYear ?? null;
  let events = filterEventsToSchoolYearWindow(parsed.events, schoolYearLabel);
  if (!events.length) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "failed",
      parseError:
        "No events in this school year were found in the uploaded document.",
      extractedText: extracted.text,
    });
    return {
      events: [],
      error:
        "No events in this school year were found in the uploaded document.",
    };
  }
  if (organization) {
    const preferences = await getImportEventPreferencesMap(organization.id);
    events = applyImportPreferencesToEvents(events, preferences);
  }

  events = await classifyParsedEventsForReview(
    events,
    organization?.id,
    organization?.schoolYear,
    activeSchoolYear?.label,
  );
  events = await withOrgPlaybookDefaults(events, organization?.id);

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

/**
 * Apply one Sync Review change decision immediately (Update / Keep Mine / Keep Both)
 * so the user does not have to wait for Finish Review for the row to take effect.
 */
export async function resolveCalendarSyncChangeAction(
  importId: string,
  event: CalendarReviewEvent,
  decision: SyncReviewDecision,
): Promise<{
  events: CalendarReviewEvent[];
  updatedCount: number;
  insertedCount: number;
  skippedCount: number;
  error: string | null;
}> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return {
      events: [],
      updatedCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      error: "Calendar upload not found.",
    };
  }

  if (importRecord.parseStatus === "imported") {
    return {
      events: [],
      updatedCount: 0,
      insertedCount: 0,
      skippedCount: 0,
      error: "This calendar has already been imported.",
    };
  }

  const allEvents = parseStoredReviewEvents(importRecord.parsedEvents);
  const target =
    allEvents.find((row) => row.id === event.id) ??
    allEvents.find(
      (row) =>
        row.importExternalId &&
        event.importExternalId &&
        row.importExternalId === event.importExternalId,
    ) ??
    event;

  const decided = applySyncReviewDecision(
    {
      ...target,
      // Prefer the latest field values from the client row when present.
      name: event.name || target.name,
      date: event.date || target.date,
      time: event.time ?? target.time,
      location: event.location ?? target.location,
      existingEventId: event.existingEventId ?? target.existingEventId,
      existingEventName: event.existingEventName ?? target.existingEventName,
      existingEventDate: event.existingEventDate ?? target.existingEventDate,
      existingEventTime: event.existingEventTime ?? target.existingEventTime,
      existingEventLocation:
        event.existingEventLocation ?? target.existingEventLocation,
      importSource: event.importSource ?? target.importSource,
      importExternalId: event.importExternalId ?? target.importExternalId,
      status: target.status === "update" ? "update" : event.status,
    },
    decision,
  );

  const {
    events: inserted,
    skippedCount,
    updatedCount,
  } = await insertImportedEvents([decided], importId, undefined, undefined, {
    autoApplyUpdates: false,
  });

  const applied =
    updatedCount > 0 ||
    inserted.length > 0 ||
    (decision === "keep_hey_ralli" && skippedCount > 0);

  if (!applied && decision === "use_calendar_update") {
    return {
      events: allEvents,
      updatedCount: 0,
      insertedCount: 0,
      skippedCount,
      error:
        "Unable to update that event. Please try Finish Review, or refresh and try again.",
    };
  }

  if (!applied && decision === "keep_both") {
    return {
      events: allEvents,
      updatedCount: 0,
      insertedCount: 0,
      skippedCount,
      error: "Unable to keep both events. Please try again.",
    };
  }

  const resolvedReason =
    decision === "use_calendar_update"
      ? "Updated from your connected calendar."
      : decision === "keep_hey_ralli"
        ? "Kept your Hey Ralli values."
        : "Kept both events.";

  const nextEvents = allEvents.map((row) => {
    if (row.id !== target.id) {
      return row;
    }
    return {
      ...decided,
      id: row.id,
      status: "duplicate" as const,
      applyUpdate: false,
      keepBothFromEventId: null,
      matchReason: resolvedReason,
    };
  });

  const saved = await saveCalendarReviewEvents(importId, nextEvents);
  if (!saved) {
    return {
      events: allEvents,
      updatedCount,
      insertedCount: inserted.length,
      skippedCount,
      error: "Updated the calendar, but could not save the review list.",
    };
  }

  revalidateCalendarPaths();
  return {
    events: nextEvents,
    updatedCount,
    insertedCount: inserted.length,
    skippedCount,
    error: null,
  };
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
): Promise<{
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
  error: string | null;
}> {
  const importRecord = await getCalendarImportById(importId);

  if (!importRecord) {
    return {
      importedCount: 0,
      skippedCount: 0,
      updatedCount: 0,
      error: "Calendar upload not found.",
    };
  }

  if (importRecord.parseStatus === "imported") {
    return {
      importedCount: 0,
      skippedCount: 0,
      updatedCount: 0,
      error: "This calendar has already been imported.",
    };
  }

  if (events.length === 0) {
    return {
      importedCount: 0,
      skippedCount: 0,
      updatedCount: 0,
      error: "No events selected to import.",
    };
  }

  const {
    events: inserted,
    skippedCount,
    updatedCount,
  } = await insertImportedEvents(events, importId, undefined, undefined, {
    autoApplyUpdates: false,
  });

  if (!inserted.length && updatedCount === 0) {
    if (skippedCount > 0) {
      await updateCalendarImportParseStatus(importId, {
        parseStatus: "imported",
        parseError: null,
        parsedEvents: events,
        importedAt: new Date().toISOString(),
      });
      revalidateCalendarPaths();
      return {
        importedCount: 0,
        skippedCount,
        updatedCount: 0,
        error: null,
      };
    }

    return {
      importedCount: 0,
      skippedCount: 0,
      updatedCount: 0,
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
  return {
    importedCount: inserted.length,
    skippedCount,
    updatedCount,
    error: null,
  };
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
): Promise<
  CalendarImportActionState & { deletedCount?: number; deletedIds?: string[] }
> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return { error: "Finish organization setup first.", success: false };
  }

  const { ok, deletedCount, deletedIds } = await deleteEventsByIds(
    eventIds,
    organization.id,
  );

  if (!ok || deletedCount === 0 || deletedIds.length === 0) {
    return {
      error: "Unable to delete selected events.",
      success: false,
      deletedCount: 0,
      deletedIds: [],
    };
  }

  revalidateCalendarPaths();
  return { error: null, success: true, deletedCount, deletedIds };
}

export async function clearCalendarWindowEventsAction(): Promise<{
  success: boolean;
  error: string | null;
  deletedCount: number;
}> {
  const organization = await getLatestOrganization();
  if (!organization) {
    return {
      success: false,
      error: "Finish organization setup first.",
      deletedCount: 0,
    };
  }

  const activeSchoolYear = await getActiveSchoolYear(organization.id);
  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYear?.label,
    organizationSchoolYear: organization.schoolYear,
  });

  const deletedCount = await getCalendarWindowEventCount(
    schoolYearLabel,
    organization.id,
  );
  if (deletedCount === 0) {
    return { success: true, error: null, deletedCount: 0 };
  }

  const { ok, deletedCount: removed } = await deleteCalendarWindowEvents(
    schoolYearLabel,
    organization.id,
  );
  if (!ok || removed === 0) {
    return {
      success: false,
      error: "Unable to clear calendar events.",
      deletedCount: 0,
    };
  }

  await resetAllCalendarImportsForOrganization(organization.id);
  if (activeSchoolYear) {
    await resetCalendarImportsForSchoolYear(activeSchoolYear.id);
  }

  revalidateCalendarPaths();
  revalidatePath("/settings");
  return { success: true, error: null, deletedCount: removed };
}

/** @deprecated Use clearCalendarWindowEventsAction — kept for settings panel param. */
export async function clearSchoolYearCalendarEventsAction(
  _schoolYearId: string,
): Promise<{ success: boolean; error: string | null; deletedCount: number }> {
  return clearCalendarWindowEventsAction();
}

export async function uploadCalendarFileAction(
  _prevState: CalendarImportActionState,
  formData: FormData,
): Promise<CalendarImportActionState> {
  const organization = await getLatestOrganization();

  if (!organization) {
    return {
      error: "Finish organization setup before uploading a calendar.",
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
  redirect(`/calendar?tab=review&import=${result.importRecord.id}`);
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

  const activeSchoolYear = organization
    ? await getActiveSchoolYear(organization.id)
    : null;
  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: activeSchoolYear?.label,
    organizationSchoolYear: organization?.schoolYear,
  });
  const existingOnCalendar = await getCalendarWindowEventsForDedup(
    schoolYearLabel,
    organization?.id ?? null,
  );

  const knownEvents = [
    ...currentEvents.map((event) => ({ name: event.name, date: event.date })),
    ...existingOnCalendar.map((event) => ({ name: event.title, date: event.date })),
  ];

  const result = await generateText({
    systemPrompt: `You find dated school calendar entries that were missed in a first pass.

Return ONLY valid JSON:
{
  "events": [
    { "name": "Event name", "date": "2025-09-01", "category": "School Event", "status": "ready" }
  ]
}

Include ONLY events that are in the document but NOT in the existing list (review list or already on the calendar).`,
    userPrompt: `School year: ${organization?.schoolYear ?? "unknown"}
Document date mentions detected: about ${expectedDates}
Known events — review list plus events already on the calendar (${knownEvents.length}):
${JSON.stringify(knownEvents, null, 2)}

Document text:
${text.slice(0, 80_000)}

Return every missing dated event.`,
    maxTokens: 16_384,
    temperature: 0.05,
    jsonMode: true,
    usage: {
      actionType: "calendar_import_parse",
      organizationId: organization?.id ?? null,
      feature: "calendar_import_find_missing",
    },
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

  const missingMapped = mapParsedEvents(missingRaw, organization?.schoolYear);
  const existingKeys = await getExistingCalendarEventKeysForWindow(schoolYearLabel);
  const reviewKeys = buildCalendarEventDedupeKeySet(
    currentEvents.map((event) => ({ name: event.name, date: event.date })),
  );
  const combinedKeys = new Set([...existingKeys, ...reviewKeys]);
  const { newEvents } = filterDuplicateReviewEvents(missingMapped, combinedKeys);
  const events = normalizeCalendarReviewEvents([
    ...currentEvents,
    ...newEvents,
  ]);
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
