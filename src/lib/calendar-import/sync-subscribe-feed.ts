import "server-only";

import {
  createCalendarImportFromIcsText,
  insertImportedEvents,
  updateCalendarImportParseStatus,
} from "@/lib/calendar-import/mutations";
import { filterDuplicateReviewEvents } from "@/lib/calendar-import/event-dedup";
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
import { getExistingCalendarEventKeysForWindow } from "@/lib/calendar-import/queries";
import {
  fetchSubscribeFeedIcs,
} from "@/lib/calendar-import/fetch-subscribe-feed";
import {
  applyImportPreferencesToEvents,
  getImportEventPreferencesMap,
  upsertImportPreferencesFromReviewEvents,
} from "@/lib/calendar-import/import-preferences";
import { parseIcsToReviewEvents } from "@/lib/calendar-import/parse-ics";
import { linkCalendarImportToSchoolYear } from "@/lib/school-years/mutations";
import type { SchoolYear } from "@/lib/school-years/types";

export interface SyncSubscribeFeedResult {
  organizationId: string;
  schoolYearId: string;
  schoolYearLabel: string;
  success: boolean;
  error: string | null;
  importId: string | null;
  added: number;
  imported: number;
  skipped: number;
  autoImported: boolean;
}

export async function syncSchoolYearSubscribeFeed(input: {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
  autoImport?: boolean;
}): Promise<SyncSubscribeFeedResult> {
  const { organizationId, organizationSchoolYear, schoolYear } = input;
  const autoImport = input.autoImport ?? false;
  const base = {
    organizationId,
    schoolYearId: schoolYear.id,
    schoolYearLabel: schoolYear.label,
    importId: null as string | null,
    added: 0,
    imported: 0,
    skipped: 0,
    autoImported: autoImport,
  };

  const subscribeUrl = schoolYear.calendarSubscribeUrl?.trim();
  if (!subscribeUrl) {
    return {
      ...base,
      success: false,
      error: "No calendar subscribe feed URL saved.",
    };
  }

  const fetched = await fetchSubscribeFeedIcs(subscribeUrl);
  if ("error" in fetched) {
    return { ...base, success: false, error: fetched.error };
  }

  const filename = `calendar-feed-${schoolYear.label.replace(/\s+/g, "-")}.ics`;
  const created = await createCalendarImportFromIcsText(
    organizationId,
    fetched.text,
    filename,
  );

  if (!created.importRecord) {
    return {
      ...base,
      success: false,
      error: created.error ?? "Unable to save calendar feed.",
    };
  }

  const importId = created.importRecord.id;
  await linkCalendarImportToSchoolYear(importId, schoolYear.id);

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsing",
    parseError: null,
  });

  const events = parseIcsToReviewEvents(fetched.text, schoolYear.label);
  if (!events.length) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "failed",
      parseError: "No events were found in the calendar feed.",
      extractedText: fetched.text,
    });
    return {
      ...base,
      importId,
      success: false,
      error: "No events were found in the calendar feed.",
    };
  }

  const preferences = await getImportEventPreferencesMap(organizationId);
  const normalizedEvents = applyImportPreferencesToEvents(events, preferences);

  const schoolYearLabel = resolveCalendarSchoolYearLabel({
    activeSchoolYearLabel: schoolYear.label,
    organizationSchoolYear,
  });
  const existingKeys = await getExistingCalendarEventKeysForWindow(schoolYearLabel);
  const { newEvents, skippedCount } = filterDuplicateReviewEvents(
    normalizedEvents,
    existingKeys,
  );

  if (!newEvents.length) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "parsed",
      parseError: null,
      extractedText: fetched.text,
      parsedEvents: [],
    });
    return {
      ...base,
      importId,
      success: true,
      error: null,
      skipped: skippedCount,
    };
  }

  if (autoImport) {
    const { events: inserted, skippedCount: importSkipped } =
      await insertImportedEvents(newEvents, importId, existingKeys);

    await updateCalendarImportParseStatus(importId, {
      parseStatus: "imported",
      parseError: null,
      extractedText: fetched.text,
      parsedEvents: newEvents,
      importedAt: new Date().toISOString(),
    });

    await upsertImportPreferencesFromReviewEvents(organizationId, newEvents);

    return {
      ...base,
      importId,
      success: true,
      error: null,
      added: newEvents.length,
      imported: inserted.length,
      skipped: skippedCount + importSkipped,
    };
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsed",
    parseError: null,
    extractedText: fetched.text,
    parsedEvents: newEvents,
  });

  return {
    ...base,
    importId,
    success: true,
    error: null,
    added: newEvents.length,
    skipped: skippedCount,
  };
}
