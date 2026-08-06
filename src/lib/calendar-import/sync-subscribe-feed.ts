import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCalendarImportFromIcsText,
  insertImportedEvents,
  updateCalendarImportParseStatus,
} from "@/lib/calendar-import/mutations";
import {
  classifyReviewEventsAgainstExisting,
  partitionClassifiedReviewEvents,
} from "@/lib/calendar-import/event-dedup";
import {
  getSchoolYearCalendarEventsForDedup,
  getSchoolYearEventsForDedupViaClient,
} from "@/lib/calendar-import/queries";
import { fetchSubscribeFeedIcs } from "@/lib/calendar-import/fetch-subscribe-feed";
import {
  applyImportPreferencesToEvents,
  getImportEventPreferencesMap,
  upsertImportPreferencesFromReviewEvents,
} from "@/lib/calendar-import/import-preferences";
import { parseIcsToReviewEvents } from "@/lib/calendar-import/parse-ics";
import { filterEventsToSchoolYearWindow } from "@/lib/calendar-import/school-year-event-window";
import { linkCalendarImportToSchoolYear } from "@/lib/school-years/mutations";
import type { SchoolYear } from "@/lib/school-years/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarReviewEvent } from "@/types/calendar-review";

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

function actionableReviewEvents(
  events: CalendarReviewEvent[],
): CalendarReviewEvent[] {
  return events.filter(
    (event) =>
      event.status === "ready" ||
      event.status === "needs_review" ||
      event.status === "update" ||
      event.status === "conflict",
  );
}

export async function syncSchoolYearSubscribeFeed(input: {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
  autoImport?: boolean;
  /**
   * Overnight / background: stage only New/Update/Conflict into Review
   * (no silent apply). Skips storing a duplicate-only batch.
   */
  stageForReview?: boolean;
  /** Use service-role client (cron / background jobs). */
  useServiceRole?: boolean;
}): Promise<SyncSubscribeFeedResult> {
  const { organizationId, schoolYear } = input;
  const stageForReview = input.stageForReview ?? false;
  const autoImport = stageForReview ? false : (input.autoImport ?? false);
  const useServiceRole = input.useServiceRole ?? false;
  const db: SupabaseClient | undefined = useServiceRole
    ? createAdminClient()
    : undefined;
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
    db,
  );

  if (!created.importRecord) {
    return {
      ...base,
      success: false,
      error: created.error ?? "Unable to save calendar feed.",
    };
  }

  const importId = created.importRecord.id;
  await linkCalendarImportToSchoolYear(importId, schoolYear.id, db);

  await updateCalendarImportParseStatus(
    importId,
    {
      parseStatus: "parsing",
      parseError: null,
    },
    db,
  );

  const events = filterEventsToSchoolYearWindow(
    parseIcsToReviewEvents(fetched.text, schoolYear.label, "subscribe"),
    schoolYear.label,
  );
  if (!events.length) {
    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "failed",
        parseError:
          "No events in this school year were found in the calendar feed.",
        extractedText: fetched.text,
      },
      db,
    );
    return {
      ...base,
      importId,
      success: false,
      error: "No events in this school year were found in the calendar feed.",
    };
  }

  const preferences = await getImportEventPreferencesMap(organizationId, db);
  const normalizedEvents = applyImportPreferencesToEvents(events, preferences);

  // External IDs must be checked across the whole school year. A rolling
  // calendar window can exclude an event after its source date is moved.
  const existing = useServiceRole
    ? await getSchoolYearEventsForDedupViaClient(schoolYear.id, db!)
    : await getSchoolYearCalendarEventsForDedup(schoolYear.id);
  const classified = classifyReviewEventsAgainstExisting(
    normalizedEvents,
    existing,
    { mode: autoImport ? "auto" : "interactive" },
  );
  const { toInsert, toUpdate, skippedDuplicates } =
    partitionClassifiedReviewEvents(classified);
  const storedEvents = stageForReview
    ? actionableReviewEvents(classified)
    : autoImport
      ? classified.filter(
          (event) =>
            event.status === "ready" ||
            event.status === "needs_review" ||
            event.status === "update",
        )
      : classified;

  if (toInsert.length === 0 && toUpdate.length === 0) {
    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "parsed",
        parseError: null,
        extractedText: fetched.text,
        parsedEvents: stageForReview || autoImport ? [] : classified,
      },
      db,
    );
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
    } = await insertImportedEvents(classified, importId, existing, db, {
      autoApplyUpdates: true,
    });

    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "imported",
        parseError: null,
        extractedText: fetched.text,
        parsedEvents: storedEvents,
        importedAt: new Date().toISOString(),
      },
      db,
    );

    await upsertImportPreferencesFromReviewEvents(
      organizationId,
      storedEvents,
      db,
    );

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

  await updateCalendarImportParseStatus(
    importId,
    {
      parseStatus: "parsed",
      parseError: null,
      extractedText: fetched.text,
      parsedEvents: storedEvents,
    },
    db,
  );

  return {
    ...base,
    importId,
    success: true,
    error: null,
    added: toInsert.length + toUpdate.length,
    updated: toUpdate.length,
    skipped: skippedDuplicates.length,
  };
}
