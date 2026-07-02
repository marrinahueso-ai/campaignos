"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { clearCalendarWindowEventsAction } from "@/lib/calendar-import/actions";
import { Button } from "@/components/ui/Button";

interface CalendarImportCleanupPanelProps {
  schoolYearLabel: string;
  eventCount: number;
}

export function CalendarImportCleanupPanel({
  schoolYearLabel,
  eventCount,
}: CalendarImportCleanupPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClearAll() {
    const confirmed = window.confirm(
      `Remove all ${eventCount} events from your calendar and campaigns? This cannot be undone. Sync or import again afterward.`,
    );
    if (!confirmed) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await clearCalendarWindowEventsAction();
      if (!result.success) {
        setError(result.error ?? "Unable to clear calendar events.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-amber-950">
            {eventCount} events on {schoolYearLabel}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Clear everything to start fresh, then sync your subscribe feed and
            upload a PDF for anything missing. Use{" "}
            <span className="font-medium">Import list</span> to delete individual
            events.
          </p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 text-red-700 hover:bg-red-50"
          onClick={handleClearAll}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? "Clearing..." : "Clear all calendar events"}
        </Button>
      </div>
    </div>
  );
}
