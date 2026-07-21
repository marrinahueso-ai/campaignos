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
import { resolveCalendarSchoolYearLabel } from "@/lib/calendar-import/calendar-window";
import {
  getCalendarWindowEventsForDedup,
  getSchoolYearEventsForDedupViaClient,
} from "@/lib/calendar-import/queries";
import {
  applyImportPreferencesToEvents,
  getImportEventPreferencesMap,
  upsertImportPreferencesFromReviewEvents,
} from "@/lib/calendar-import/import-preferences";
import { parseIcsToReviewEvents } from "@/lib/calendar-import/parse-ics";
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

export async function syncSchoolYearGoogleCalendar(input: {
  organizationId: string;
  organizationSchoolYear: string | null;
  schoolYear: SchoolYear;
  connection: GoogleCalendarConnection;
  autoImport?: boolean;
  /** Use service-role client (cron / background jobs). */
  useServiceRole?: boolean;
}): Promise<SyncGoogleCalendarResult> {
  const { organizationId, organizationSchoolYear, schoolYear, connection } =
    input;
  const autoImport = input.autoImport ?? false;
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

  const window = googleSyncWindow();
  const listed = await listGoogleCalendarEvents({
    accessToken,
    calendarId: connection.googleCalendarId,
    timeMin: window.timeMin,
    timeMax: window.timeMax,
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

  const events = parseIcsToReviewEvents(icsText, schoolYear.label, "google");
  if (!events.length) {
    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "failed",
        parseError:
          "No events were found on Google Calendar in this date range.",
        extractedText: icsText,
      },
      db,
    );
    return {
      ...base,
      importId,
      success: false,
      error: "No events were found on Google Calendar in this date range.",
    };
  }

  const preferences = await getImportEventPreferencesMap(organizationId, db);
  const normalizedEvents = applyImportPreferencesToEvents(events, preferences);

  const existing = useServiceRole
    ? await getSchoolYearEventsForDedupViaClient(schoolYear.id, db!)
    : await getCalendarWindowEventsForDedup(
        resolveCalendarSchoolYearLabel({
          activeSchoolYearLabel: schoolYear.label,
          organizationSchoolYear,
        }),
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
    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "parsed",
        parseError: null,
        extractedText: icsText,
        parsedEvents: autoImport ? [] : classified,
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
    } = await insertImportedEvents(
      classified,
      importId,
      existing,
      db,
      { autoApplyUpdates: true },
    );

    await updateCalendarImportParseStatus(
      importId,
      {
        parseStatus: "imported",
        parseError: null,
        extractedText: icsText,
        parsedEvents: reviewEvents,
        importedAt: new Date().toISOString(),
      },
      db,
    );

    await upsertImportPreferencesFromReviewEvents(
      organizationId,
      reviewEvents,
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
      parsedEvents: reviewEvents,
    },
    db,
  );

  return {
    ...base,
    importId,
    success: true,
    error: null,
    added: toInsert.length + toUpdate.length,
    skipped: skippedDuplicates.length,
  };
}

function googleSyncWindow(): { timeMin: string; timeMax: string } {
  const now = new Date();
  const start = new Date(now);
  start.setUTCMonth(start.getUTCMonth() - 1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCHours(23, 59, 59, 999);
  return {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
  };
}
