import Link from "next/link";
import { Suspense } from "react";
import { CalendarImportForm } from "@/components/calendar-import/CalendarImportForm";
import { CalendarSubscribeFeedSection } from "@/components/calendar-import/CalendarSubscribeFeedSection";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Import Calendar",
};

export default function CalendarImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-cos-text">
            Import school calendar
          </h1>
          <Button href="/calendar/review" variant="secondary" size="sm">
            Review latest upload
          </Button>
        </div>
        <p className="text-sm text-cos-muted">
          Link a live ICS subscribe feed (recommended) or upload a calendar file.
          Feed sync skips events you already have so refreshes do not duplicate.
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-sm text-cos-muted">Loading calendar feed…</p>
        }
      >
        <CalendarSubscribeFeedSection />
      </Suspense>

      <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-display text-xl text-cos-text">
          Or upload a file
        </h2>
        <p className="mb-4 text-sm text-cos-muted">
          Upload your district or school calendar (ICS or PDF). We extract dates,
          let you clean up mistakes, then add view-only events. You can turn any
          date into a full campaign later.
        </p>
        <CalendarImportForm />
      </div>

      <p className="text-sm text-cos-muted">
        Manage this feed anytime from{" "}
        <Link
          href="/settings/integrations/calendar"
          className="font-medium text-cos-accent hover:underline"
        >
          Integrations → Google Calendar
        </Link>
        , or during{" "}
        <Link
          href="/settings/school-setup"
          className="font-medium text-cos-accent hover:underline"
        >
          School Setup
        </Link>
        .
      </p>
    </div>
  );
}
