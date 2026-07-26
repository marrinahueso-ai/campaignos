import { Suspense } from "react";
import { CalendarImportEasePanel } from "@/components/calendar-import/CalendarImportEasePanel";
import { CalendarImportForm } from "@/components/calendar-import/CalendarImportForm";
import { CalendarSubscribeFeedSection } from "@/components/calendar-import/CalendarSubscribeFeedSection";
import { GoogleCalendarImportSection } from "@/components/calendar-import/GoogleCalendarImportSection";

interface CalendarImportEaseSectionsProps {
  embedded?: boolean;
}

/**
 * Server-rendered import doorway (Google / subscribe / upload).
 * Continue uses /calendar?tab=review when not wired by the Calendar shell.
 */
export function CalendarImportEaseSections({
  embedded = false,
}: CalendarImportEaseSectionsProps) {
  return (
    <CalendarImportEasePanel
      embedded={embedded}
      googleSection={
        <Suspense
          fallback={
            <p className="text-sm text-cos-muted">Loading Google Calendar…</p>
          }
        >
          <GoogleCalendarImportSection variant="ease" />
        </Suspense>
      }
      subscribeSection={
        <Suspense
          fallback={
            <p className="text-sm text-cos-muted">Loading calendar feed…</p>
          }
        >
          <CalendarSubscribeFeedSection variant="ease" />
        </Suspense>
      }
      uploadSection={<CalendarImportForm variant="ease" />}
    />
  );
}
