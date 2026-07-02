import { FileSearch, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface CalendarReviewActionsProps {
  onImportAll: () => void;
  onReviewIndividually: () => void;
  onFindMissing?: () => void;
  isImporting?: boolean;
  importComplete?: boolean;
}

export function CalendarReviewActions({
  onImportAll,
  onReviewIndividually,
  onFindMissing,
  isImporting = false,
  importComplete = false,
}: CalendarReviewActionsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-cos-border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-cos-text">Ready to import?</p>
        <p className="mt-1 text-sm text-cos-muted">
          Confirm all events or review each one before adding them to your calendar.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button href="/calendar/import" variant="secondary">
          <Upload className="h-4 w-4" />
          Upload Different Calendar
        </Button>
        <Button variant="secondary" onClick={onReviewIndividually}>
          <FileSearch className="h-4 w-4" />
          Review Individually
        </Button>
        {onFindMissing && (
          <Button variant="secondary" onClick={onFindMissing} disabled={isImporting || importComplete}>
            <Search className="h-4 w-4" />
            Find missing events
          </Button>
        )}
        <Button onClick={onImportAll} disabled={isImporting || importComplete}>
          {importComplete
            ? "All Events Imported"
            : isImporting
              ? "Importing..."
              : "Import All"}
        </Button>
      </div>
    </div>
  );
}
