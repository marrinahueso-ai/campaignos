import { CalendarDays, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface CalendarReviewHeaderProps {
  filename: string;
  uploadedAt: string;
  eventCount: number;
}

function formatUploadedAt(isoDate: string): string {
  return new Date(isoDate).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CalendarReviewHeader({
  filename,
  uploadedAt,
  eventCount,
}: CalendarReviewHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cos-border bg-gradient-to-br from-white via-cos-accent-soft/40 to-cos-bg shadow-sm">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-cos-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cos-text">
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar Import Review
          </div>
          <div>
            <h1 className="text-2xl font-bold text-cos-text sm:text-3xl">
              Review imported events
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-cos-muted">
              We scanned your school calendar and found events ready for review.
              Confirm categories, resolve conflicts, and import when you are ready.
            </p>
          </div>
        </div>

        <div className="min-w-[260px] rounded-xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cos-accent-soft">
              <FileText className="h-5 w-5 text-cos-accent" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-cos-text">
                {filename}
              </p>
              <p className="mt-1 text-xs text-cos-muted">
                Uploaded {formatUploadedAt(uploadedAt)}
              </p>
              <Badge variant="info" className="mt-3">
                {eventCount} events detected
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
