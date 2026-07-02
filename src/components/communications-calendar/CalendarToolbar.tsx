"use client";

import { CalendarRange, ChevronLeft, ChevronRight, List, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  CALENDAR_MODES,
  CALENDAR_VIEWS,
} from "@/lib/communications-calendar/constants";
import type { CalendarMode, CalendarView } from "@/types/communications-calendar";

interface CalendarToolbarProps {
  view: CalendarView;
  mode: CalendarMode;
  periodLabel: string;
  onViewChange: (view: CalendarView) => void;
  onModeChange: (mode: CalendarMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  fixedMode?: CalendarMode;
  embedded?: boolean;
}

const VIEW_ICONS: Record<CalendarView, typeof CalendarRange> = {
  month: CalendarRange,
  week: Rows3,
  list: List,
};

export function CalendarToolbar({
  view,
  mode,
  periodLabel,
  onViewChange,
  onModeChange,
  onPrevious,
  onNext,
  onToday,
  fixedMode,
  embedded = false,
}: CalendarToolbarProps) {
  const activeMode = CALENDAR_MODES.find((entry) => entry.value === mode);
  const visibleModes = fixedMode
    ? CALENDAR_MODES.filter((entry) => entry.value === fixedMode)
    : CALENDAR_MODES;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {!embedded && (
            <p className="text-sm font-medium text-cos-accent">Communications Calendar</p>
          )}
          <h2 className="text-xl font-bold tracking-tight text-cos-text">
            {periodLabel}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-cos-muted">
            {activeMode?.description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={onNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!embedded && (
            <Button href="/calendar/review" variant="ghost" size="sm">
              Review Imports
            </Button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 xl:flex-row xl:items-center",
          fixedMode ? "xl:justify-end" : "xl:justify-between",
        )}
      >
        {!fixedMode && (
          <div className="flex flex-wrap gap-2">
            {visibleModes.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => onModeChange(entry.value)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  mode === entry.value
                    ? "bg-cos-primary text-white shadow-sm"
                    : "bg-white text-cos-muted ring-1 ring-slate-200 hover:bg-cos-bg",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex rounded-xl bg-cos-bg-alt p-1">
          {CALENDAR_VIEWS.map((entry) => {
            const Icon = VIEW_ICONS[entry.value];
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => onViewChange(entry.value)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  view === entry.value
                    ? "bg-white text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{entry.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
