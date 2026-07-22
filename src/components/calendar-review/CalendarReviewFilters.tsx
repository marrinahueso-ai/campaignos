"use client";

import { Search } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type { CalendarReviewDateFilter } from "@/lib/calendar-import/review-filters";

interface CalendarReviewFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  dateFilter: CalendarReviewDateFilter;
  onDateFilterChange: (value: CalendarReviewDateFilter) => void;
  pastCount: number;
  upcomingCount: number;
  disabled?: boolean;
}

const DATE_FILTERS: {
  value: CalendarReviewDateFilter;
  label: string;
  countKey: "all" | "upcoming" | "past";
}[] = [
  { value: "all", label: "All dates", countKey: "all" },
  { value: "upcoming", label: "Upcoming", countKey: "upcoming" },
  { value: "past", label: "Past", countKey: "past" },
];

export function CalendarReviewFilters({
  searchQuery,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  pastCount,
  upcomingCount,
  disabled = false,
}: CalendarReviewFiltersProps) {
  const counts = {
    all: pastCount + upcomingCount,
    upcoming: upcomingCount,
    past: pastCount,
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cos-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full max-w-md">
        <span className="sr-only">Search events</span>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, category, or date..."
          disabled={disabled}
          className="h-10 w-full rounded-lg border border-cos-border bg-white py-2 pr-3 pl-10 text-sm text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none focus:ring-2 focus:ring-cos-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden flex-wrap gap-1.5 sm:flex" role="group" aria-label="Filter by date">
          {DATE_FILTERS.map(({ value, label, countKey }) => {
            const isActive = dateFilter === value;
            return (
              <button
                key={value}
                type="button"
                disabled={disabled}
                onClick={() => onDateFilterChange(value)}
                aria-pressed={isActive}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  isActive
                    ? "border-cos-text bg-cos-text text-white"
                    : "border-cos-border bg-cos-bg text-cos-text hover:bg-cos-accent-soft/40",
                )}
              >
                {label}
                <span className={cn("ml-1.5", isActive ? "text-white/80" : "text-cos-muted")}>
                  {counts[countKey]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-full sm:hidden">
          <Select
            aria-label="Filter by date"
            value={dateFilter}
            disabled={disabled}
            onChange={(event) =>
              onDateFilterChange(event.target.value as CalendarReviewDateFilter)
            }
          >
            {DATE_FILTERS.map(({ value, label, countKey }) => (
              <option key={value} value={value}>
                {label} ({counts[countKey]})
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}
