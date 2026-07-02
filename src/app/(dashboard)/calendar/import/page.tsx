import Link from "next/link";
import { CalendarImportForm } from "@/components/calendar-import/CalendarImportForm";
import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Import Calendar",
};

export default function CalendarImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-cos-text">Import school calendar</h1>
          <Button href="/calendar/review" variant="secondary" size="sm">
            Review latest upload
          </Button>
        </div>
        <p className="text-sm text-cos-muted">
          Upload your district or school calendar. We will extract dates, let you
          clean up mistakes in a list, then add view-only events to your calendar.
          You can turn any date into a full campaign later.
        </p>
      </div>

      <div className="rounded-2xl border border-cos-border bg-white p-6 shadow-sm">
        <CalendarImportForm />
      </div>

      <p className="text-sm text-cos-muted">
        First-time setup? You can also upload during{" "}
        <Link href="/settings/school-setup" className="font-medium text-cos-accent hover:underline">
          School Setup
        </Link>
        .
      </p>
    </div>
  );
}
