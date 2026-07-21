import "server-only";

import {
  createCalendarImportFromIcsText,
  insertImportedEvents,
  updateCalendarImportParseStatus,
} from "@/lib/calendar-import/mutations";
import {
  classifyReviewEventsAgainstExisting,
  partitionClassifiedReviewEvents,
} from "@/lib/calendar-import/event-dedup";
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
import { getCalendarWindowEventsForDedup } from "@/lib/calendar-import/queries";
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
  updated: number;
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
    updated: 0,
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

  const events = parseIcsToReviewEvents(
    fetched.text,
    schoolYear.label,
    "subscribe",
  );
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
  const existing = await getCalendarWindowEventsForDedup(
    schoolYearLabel,
    organizationId,
  );
  const classified = classifyReviewEventsAgainstExisting(
    normalizedEvents,
    existing,
    { mode: autoImport ? "auto" : "interactive" },
  );
  const { toInsert, toUpdate, skippedDuplicates } =
    partitionClassifiedReviewEvents(classified);
  const reviewEvents = autoImport
    ? classified.filter(
        (event) =>
          event.status === "ready" ||
          event.status === "needs_review" ||
          event.status === "update",
      )
    : classified;

  if (toInsert.length === 0 && toUpdate.length === 0) {
    await updateCalendarImportParseStatus(importId, {
      parseStatus: "parsed",
      parseError: null,
      extractedText: fetched.text,
      parsedEvents: autoImport ? [] : classified,
    });
    return {
      ...base,
      importId,
      success: true,
      error: null,
      skipped: skippedDuplicates.length,
    };
  }

  if (autoImport) {
    const {
      events: inserted,
      skippedCount: importSkipped,
      updatedCount,
    } = await insertImportedEvents(classified, importId, existing, undefined, {
      autoApplyUpdates: true,
    });

    await updateCalendarImportParseStatus(importId, {
      parseStatus: "imported",
      parseError: null,
      extractedText: fetched.text,
      parsedEvents: reviewEvents,
      importedAt: new Date().toISOString(),
    });

    await upsertImportPreferencesFromReviewEvents(organizationId, reviewEvents);

    return {
      ...base,
      importId,
      success: true,
      error: null,
      added: toInsert.length,
      imported: inserted.length,
      updated: updatedCount,
      skipped: skippedDuplicates.length + importSkipped,
    };
  }

  await updateCalendarImportParseStatus(importId, {
    parseStatus: "parsed",
    parseError: null,
    extractedText: fetched.text,
    parsedEvents: reviewEvents,
  });

  return {
    ...base,
    importId,
    success: true,
    error: null,
    added: toInsert.length + toUpdate.length,
    skipped: skippedDuplicates.length,
  };
}
