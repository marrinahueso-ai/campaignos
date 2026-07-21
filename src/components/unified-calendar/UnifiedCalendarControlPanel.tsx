"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LayoutGrid,
  List,
  Rows3,
  TableProperties,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  UNIFIED_CALENDAR_LAYERS,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { cn } from "@/lib/utils/cn";
import type {
  PlanningCalendarItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import { heatmapSourceLabel } from "@/lib/posting-analytics/heatmap-ui";

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

const UPCOMING_PREVIEW_LIMIT = 5;

interface UnifiedCalendarControlPanelProps {
  view: PlanningCalendarView;
  periodLabel: string;
  activeLayers: Set<CalendarLayerId>;
  upcomingItems: PlanningCalendarItem[];
  showImportList?: boolean;
  postingHeatmap?: PostingHeatmapData | null;
  showPostingHeatmap?: boolean;
  onShowPostingHeatmapChange?: (value: boolean) => void;
  onViewChange: (view: PlanningCalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onLayersChange: (layers: Set<CalendarLayerId>) => void;
  onSelectUpcomingItem: (item: PlanningCalendarItem) => void;
  /** Hides Import/Review actions and the upcoming list — used for marketing screen capture. */
  compact?: boolean;
}

export function UnifiedCalendarControlPanel({
  view,
  periodLabel,
  activeLayers,
  upcomingItems,
  showImportList = true,
  postingHeatmap = null,
  showPostingHeatmap = false,
  onShowPostingHeatmapChange,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onLayersChange,
  onSelectUpcomingItem,
  compact = false,
}: UnifiedCalendarControlPanelProps) {
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  const visibleViews = showImportList
    ? VIEW_OPTIONS
    : VIEW_OPTIONS.filter((option) => option.value !== "import-list");

  function toggleLayer(layerId: CalendarLayerId) {
    const next = new Set(activeLayers);
    if (next.has(layerId)) {
      next.delete(layerId);
    } else {
      next.add(layerId);
    }
    onLayersChange(next);
  }

  const previewItems = upcomingItems.slice(0, UPCOMING_PREVIEW_LIMIT);
  const hiddenUpcoming = upcomingItems.length - previewItems.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm">
      {/* Period + nav/actions; view switcher under Today / Import / Review */}
      <div className="flex flex-col gap-2.5 border-b border-cos-border px-4 py-2.5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display truncate text-2xl leading-tight text-cos-text sm:text-3xl">
            {periodLabel}
          </h1>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
            {!compact && (
              <>
                <Button href="/calendar/import" variant="secondary" size="sm">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                <Button href="/calendar/review" variant="secondary" size="sm">
                  <FileSearch className="h-4 w-4" />
                  Review
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center self-start border border-cos-border bg-cos-bg p-0.5 sm:self-end">
            {visibleViews.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onViewChange(value)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium transition-colors",
                  view === value
                    ? "bg-cos-card text-cos-text shadow-sm"
                    : "text-cos-muted hover:text-cos-text",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layer filters — inline */}
      {view !== "import-list" && (
        <div className="flex flex-wrap items-center gap-2 border-b border-cos-border px-4 py-2">
          <span className="text-xs font-medium uppercase tracking-wide text-cos-muted">Show</span>
          {UNIFIED_CALENDAR_LAYERS.map((layer) => {
            const active = activeLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLayer(layer.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-cos-text text-cos-card"
                    : "bg-cos-bg text-cos-muted hover:text-cos-text",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    active ? layer.accent : "bg-cos-border",
                  )}
                />
                {layer.label}
              </button>
            );
          })}

          {view === "week" &&
            postingHeatmap != null &&
            onShowPostingHeatmapChange && (
            <>
              <span className="mx-1 hidden h-4 w-px bg-cos-border sm:inline-block" aria-hidden />
              <button
                type="button"
                aria-pressed={showPostingHeatmap}
                onClick={() => onShowPostingHeatmapChange(!showPostingHeatmap)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  showPostingHeatmap
                    ? "bg-cos-accent text-white"
                    : "bg-cos-bg text-cos-muted hover:text-cos-text",
                )}
              >
                Best times to post
              </button>
            </>
          )}
        </div>
      )}

      {view === "week" && showPostingHeatmap && postingHeatmap != null && (
        <div className="flex flex-wrap items-center gap-3 border-b border-cos-border bg-cos-bg/30 px-4 py-2 text-xs text-cos-muted">
          <span>Darker = families more likely to see posts</span>
          <span className="hidden h-3 w-px bg-cos-border sm:inline-block" aria-hidden />
          <span className="inline-flex items-center gap-2">
            <span>Low</span>
            <span
              className="inline-flex h-3 w-20 overflow-hidden rounded-full ring-1 ring-cos-border"
              aria-hidden
            >
              <span className="flex-1 bg-cos-accent-soft" />
              <span className="flex-1 bg-cos-accent/40" />
              <span className="flex-1 bg-cos-accent/70" />
              <span className="flex-1 bg-cos-accent" />
            </span>
            <span>High</span>
          </span>
          <span className="hidden h-3 w-px bg-cos-border sm:inline-block" aria-hidden />
          <span>Source: {heatmapSourceLabel(postingHeatmap)}</span>
        </div>
      )}

      {/* Upcoming — collapsible */}
      {!compact && view !== "import-list" && (
        <div className="bg-cos-bg/30">
          <button
            type="button"
            onClick={() => setUpcomingOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left"
            aria-expanded={upcomingOpen}
          >
            <span className="flex items-center gap-2">
              {upcomingOpen ? (
                <ChevronDown className="h-4 w-4 text-cos-muted" />
              ) : (
                <ChevronRight className="h-4 w-4 text-cos-muted" />
              )}
              <span className="text-sm font-medium text-cos-text">Coming up</span>
              <span className="text-xs text-cos-muted">
                {upcomingItems.length === 0
                  ? "No campaigns in the next 7 days"
                  : `${upcomingItems.length} ${upcomingItems.length === 1 ? "campaign" : "campaigns"} in the next 7 days`}
              </span>
            </span>
            {upcomingItems.length > UPCOMING_PREVIEW_LIMIT && (
              <Link
                href="/events"
                onClick={(event) => event.stopPropagation()}
                className="text-xs font-medium text-cos-text underline-offset-2 hover:underline"
              >
                All campaigns
              </Link>
            )}
          </button>

          {upcomingOpen && upcomingItems.length > 0 && (
            <ul className="space-y-1 border-t border-cos-border/60 px-4 py-2.5">
              {previewItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelectUpcomingItem(item)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-cos-card"
                  >
                    <p className="min-w-0 truncate text-sm font-medium text-cos-text">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-xs text-cos-muted">
                      {formatShortDate(item.scheduledDate)}
                    </span>
                  </button>
                </li>
              ))}
              {hiddenUpcoming > 0 && (
                <li className="pt-1">
                  <Link
                    href="/events"
                    className="flex w-full items-center justify-center rounded-lg border border-dashed border-cos-border py-2 text-xs font-medium text-cos-muted hover:text-cos-text"
                  >
                    View all {upcomingItems.length} campaigns
                  </Link>
                </li>
              )}
            </ul>
          )}

          {upcomingOpen && upcomingItems.length === 0 && (
            <p className="border-t border-cos-border/60 px-4 py-2.5 text-sm text-cos-muted">
              No campaign events in the next 7 days.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
