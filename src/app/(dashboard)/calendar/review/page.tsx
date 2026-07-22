import { CalendarImportReview } from "@/components/calendar-review/CalendarImportReview";
import { Button } from "@/components/ui/Button";
import { getCalendarReviewPageData } from "@/lib/calendar-import/queries";

export const metadata = {
  title: "Calendar Review",
};

interface CalendarReviewPageProps {
  searchParams: Promise<{ import?: string }>;
}

export default async function CalendarReviewPage({
  searchParams,
}: CalendarReviewPageProps) {
  const params = await searchParams;
  const { importRecord, reviewData, importedEventCount, playbookOptions } =
    await getCalendarReviewPageData(params.import);

  if (!importRecord || !reviewData) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-cos-text">
          Review calendar import
        </h1>
        <p className="text-sm text-cos-muted">
          Connect Google Calendar, paste a subscribe link, or upload a file
          first. We will read the dates and let you review them before they
          appear on your calendar.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button href="/settings/integrations/calendar">
            Sign in with Google
          </Button>
          <Button href="/calendar/import" variant="secondary">
            Import calendar
          </Button>
          <Button href="/settings/school-setup" variant="ghost">
            Get started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CalendarImportReview
      importId={importRecord.id}
      parseStatus={importRecord.parseStatus}
      parseError={importRecord.parseError}
      data={reviewData}
      importedEventCount={importedEventCount}
      playbookOptions={playbookOptions}
    />
  );
}
