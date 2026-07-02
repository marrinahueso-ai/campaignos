"use client";

import { CalendarRange, FileSearch, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function UnifiedCalendarHeader() {
  return (
    <header className="rounded-2xl border border-cos-border bg-cos-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cos-info text-cos-info-text">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-cos-text">Calendar</h1>
            <p className="mt-1 max-w-xl text-sm text-cos-muted">
              Your school year in one place — events, posts, deadlines, and what
              still needs attention.
            </p>
          </div>
        </div>
        <Button href="/calendar/import" variant="secondary" size="sm">
          <Upload className="h-4 w-4" />
          Import calendar
        </Button>
        <Button href="/calendar/review" variant="secondary" size="sm">
          <FileSearch className="h-4 w-4" />
          Review imported calendar
        </Button>
      </div>
    </header>
  );
}
