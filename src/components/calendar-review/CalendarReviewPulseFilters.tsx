"use client";

import { cn } from "@/lib/utils/cn";
import type { CalendarReviewFilter } from "@/lib/calendar-import/review-filters";
import type { CalendarReviewEvent } from "@/types/calendar-review";

interface CalendarReviewPulseFiltersProps {
  events: CalendarReviewEvent[];
  activeFilter: CalendarReviewFilter;
  onFilterChange: (filter: CalendarReviewFilter) => void;
}

export function CalendarReviewPulseFilters({
  events,
  activeFilter,
  onFilterChange,
}: CalendarReviewPulseFiltersProps) {
  const needs = events.filter((e) => e.status === "needs_review").length;
  const ready = events.filter((e) => e.status === "ready").length;
  const updates = events.filter((e) => e.status === "update").length;
  const conflicts = events.filter((e) => e.status === "conflict").length;
  const duplicates = events.filter((e) => e.status === "duplicate").length;

  // Actionable first; duplicates stay available but quieter.
  const tabs: Array<{
    id: CalendarReviewFilter;
    label: string;
    count: number;
  }> = (
    [
      { id: "needs_review", label: "Needs you", count: needs },
      { id: "ready", label: "New", count: ready },
      { id: "updates", label: "Updates", count: updates },
      { id: "conflicts", label: "Conflicts", count: conflicts },
      { id: "duplicates", label: "Duplicates", count: duplicates },
    ] as const
  ).filter((tab) => (tab.id === "duplicates" ? tab.count > 0 : true));

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Review filters"
    >
      {tabs.map((tab) => {
        const on = tab.id === activeFilter;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onFilterChange(tab.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition",
              on
                ? "border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                : "border-transparent bg-transparent text-cos-muted hover:text-cos-text",
            )}
          >
            {tab.label}
            <span className="ml-1 tabular-nums">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}
