"use client";

import { ChevronLeft, ChevronRight, LayoutGrid, List, Rows3, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarView } from "@/types/communications-calendar";

interface PlanningCalendarToolbarProps {
  view: PlanningCalendarView;
  periodLabel: string;
  onViewChange: (view: PlanningCalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  showImportList?: boolean;
}

const VIEW_OPTIONS: {
  value: PlanningCalendarView;
  label: string;
  icon: typeof LayoutGrid;
}[] = [
  { value: "month", label: "Month", icon: LayoutGrid },
  { value: "week", label: "Week", icon: Rows3 },
  { value: "agenda", label: "Agenda", icon: List },
  { value: "import-list", label: "Import list", icon: TableProperties },
];

export function PlanningCalendarToolbar({
  view,
  periodLabel,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  showImportList = true,
}: PlanningCalendarToolbarProps) {
  const visibleViews = showImportList
    ? VIEW_OPTIONS
    : VIEW_OPTIONS.filter((option) => option.value !== "import-list");

  return (
    <div className="flex flex-col gap-4 border border-cos-border bg-cos-card p-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="studio-eyebrow">Your calendar</p>
        <h1 className="font-display mt-1 text-3xl text-cos-text">{periodLabel}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-cos-border bg-cos-bg p-1">
          {visibleViews.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => onViewChange(value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                view === value
                  ? "bg-cos-card text-cos-text shadow-sm"
                  : "text-cos-muted hover:text-cos-text",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {view !== "import-list" && (
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={onPrevious} aria-label="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={onToday}>
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={onNext} aria-label="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
