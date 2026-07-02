"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteImportedCalendarEventsAction } from "@/lib/calendar-import/actions";
import { Button } from "@/components/ui/Button";

interface CalendarImportCleanupPanelProps {
  importId: string;
  filename: string;
  importedCount: number;
}

export function CalendarImportCleanupPanel({
  importId,
  filename,
  importedCount,
}: CalendarImportCleanupPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDeleteAll() {
    setError(null);

    startTransition(async () => {
      const result = await deleteImportedCalendarEventsAction(importId);
      if (!result.success) {
        setError(result.error ?? "Unable to delete imported events.");
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
            Testing import from {filename}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            {importedCount} imported events are on this calendar. Remove them all
            when you are done testing.
          </p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 text-red-700 hover:bg-red-50"
          onClick={handleDeleteAll}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? "Deleting..." : "Delete all imported events"}
        </Button>
      </div>
    </div>
  );
}
