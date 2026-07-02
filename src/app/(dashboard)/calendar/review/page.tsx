import { CalendarImportReview } from "@/components/calendar-review/CalendarImportReview";
import { Button } from "@/components/ui/Button";
import { getCalendarReviewPageData } from "@/lib/calendar-import/queries";

export const metadata = {
  title: "Calendar Review",
};

export default async function CalendarReviewPage() {
  const { importRecord, reviewData, importedEventCount } =
    await getCalendarReviewPageData();

  if (!importRecord || !reviewData) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-cos-text">Review calendar import</h1>
        <p className="text-sm text-cos-muted">
          Upload your school calendar first. We will read the dates and let you
          review them before they appear on your calendar.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button href="/calendar/import">Upload calendar</Button>
          <Button href="/settings/school-setup" variant="secondary">
            School setup
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
    />
  );
}
