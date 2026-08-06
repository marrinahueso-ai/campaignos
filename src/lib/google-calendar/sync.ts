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
import {
  applyImportPreferencesToEvents,
  getImportEventPreferencesMap,
  upsertImportPreferencesFromReviewEvents,
} from "@/lib/calendar-import/import-preferences";
import { parseIcsToReviewEvents } from "@/lib/calendar-import/parse-ics";
import {
  filterEventsToSchoolYearWindow,
  schoolYearGoogleTimeBounds,
} from "@/lib/calendar-import/school-year-event-window";
import {
  googleEventsToIcsText,
  listGoogleCalendarEvents,
} from "@/lib/google-calendar/api";
import {
  getValidGoogleAccessToken,
  isGoogleCalendarConnectionConfigured,
} from "@/lib/google-calendar/connection";
import type { GoogleCalendarConnection } from "@/lib/google-calendar/types";
import { linkCalendarImportToSchoolYear } from "@/lib/school-years/mutations";
import type { SchoolYear } from "@/lib/school-years/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CalendarReviewEvent } from "@/types/calendar-review";

export interface SyncGoogleCalendarResult {
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

export async function syncSchoolYearGoogleCalendar(input: {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
  connection: GoogleCalendarConnection;
  autoImport?: boolean;
  /**
   * Overnight / background: stage only New/Update/Conflict into Review
   * (no silent apply). Skips storing a duplicate-only batch.
   */
  stageForReview?: boolean;
  /** Use service-role client (cron / background jobs). */
  useServiceRole?: boolean;
}): Promise<SyncGoogleCalendarResult> {
  const { organizationId, schoolYear, connection } = input;
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

  if (!isGoogleCalendarConnectionConfigured(connection)) {
    return {
      ...base,
      success: false,
      error: "Google Calendar is not connected.",
    };
  }

  const accessToken = await getValidGoogleAccessToken(connection, {
    client: db,
    useServiceRole,
  });
  if (!accessToken) {
    return {
      ...base,
      success: false,
      error: "Google access expired. Reconnect Google Calendar.",
    };
  }

  const window = schoolYearGoogleTimeBounds(schoolYear.label);
  const listed = await listGoogleCalendarEvents({
    accessToken,
    calendarId: connection.googleCalendarId,
    timeMin: window.timeMin,
    timeMax: window.timeMax,
    organizationId: connection.organizationId,
  });

  if (listed.error) {
    return { ...base, success: false, error: listed.error };
  }

  const icsText = googleEventsToIcsText(
    listed.events,
    connection.googleAccountEmail
      ? `Google · ${connection.googleAccountEmail}`
      : "Google Calendar",
  );

  const filename = `google-calendar-${schoolYear.label.replace(/\s+/g, "-")}.ics`;
  const created = await createCalendarImportFromIcsText(
    organizationId,
    icsText,
    filename,
    db,
  );

  if (!created.importRecord) {
    return {
      ...base,
      success: false,
      error: created.error ?? "Unable to save Google Calendar sync.",
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
    parseIcsToReviewEvents(icsText, schoolYear.label, "google"),
    schoolYear.label,
  );
  if (!events.length) {
    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "failed",
        parseError:
          "No events in this school year were found on Google Calendar.",
        extractedText: icsText,
      },
      db,
    );
    return {
      ...base,
      importId,
      success: false,
      error: "No events in this school year were found on Google Calendar.",
    };
  }

  const preferences = await getImportEventPreferencesMap(organizationId, db);
  const normalizedEvents = applyImportPreferencesToEvents(events, preferences);

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
        extractedText: icsText,
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
        extractedText: icsText,
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
      extractedText: icsText,
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
