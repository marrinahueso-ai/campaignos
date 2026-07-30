"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { DashboardWidgetColorPicker } from "@/components/today/DashboardWidgetColorPicker";
import type { CalendarLayerColorMap } from "@/components/unified-calendar/CalendarLayerColorsContext";
import {
  DEFAULT_CALENDAR_LAYER_COLORS,
  type CalendarLayerColors,
} from "@/lib/communications-calendar/calendar-layout";
import {
  UNIFIED_CALENDAR_LAYERS,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import { heatmapSourceLabel } from "@/lib/posting-analytics/heatmap-ui";
import type { PostingHeatmapData } from "@/lib/posting-analytics/types";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarView } from "@/types/communications-calendar";

const VIEW_OPTIONS: { value: PlanningCalendarView; label: string; heat?: boolean }[] =
  [
    { value: "month", label: "Month" },
    { value: "week", label: "Week" },
    { value: "best-times", label: "Best times", heat: true },
    { value: "agenda", label: "Agenda" },
  ];

const SHOW_CALENDAR_SEARCH = new Set<PlanningCalendarView>([
  "month",
  "week",
  "best-times",
]);
const HIDE_LAYERS = new Set<PlanningCalendarView>([
  "import-list",
  "import",
  "review",
]);
const SHOW_PERIOD_NAV = new Set<PlanningCalendarView>([
  "month",
  "week",
  "best-times",
  "agenda",
]);
const HIDE_PERIOD_LABEL = new Set<PlanningCalendarView>([
  "import-list",
  "import",
  "review",
]);

interface UnifiedCalendarControlPanelProps {
  view: PlanningCalendarView;
  periodLabel: string;
  activeLayers: Set<CalendarLayerId>;
  layerColors?: CalendarLayerColorMap;
  layerColorOverrides?: CalendarLayerColors;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  /** @deprecated Calendar's primary view row is always limited to four views. */
  showImportList?: boolean;
  postingHeatmap?: PostingHeatmapData | null;
  /** Kept for marketing previews; Best times is first-class now. */
  showPostingHeatmap?: boolean;
  onShowPostingHeatmapChange?: (value: boolean) => void;
  onViewChange: (view: PlanningCalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onLayersChange: (layers: Set<CalendarLayerId>) => void;
  onLayerColorChange?: (layerId: CalendarLayerId, color: string | null) => void;
  compact?: boolean;
}

export function UnifiedCalendarControlPanel({
  view,
  periodLabel,
  activeLayers,
  layerColors = DEFAULT_CALENDAR_LAYER_COLORS,
  layerColorOverrides = {},
  searchQuery = "",
  onSearchQueryChange,
  postingHeatmap = null,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onLayersChange,
  onLayerColorChange,
  compact = false,
}: UnifiedCalendarControlPanelProps) {
  function toggleLayer(layerId: CalendarLayerId) {
    const next = new Set(activeLayers);
    if (next.has(layerId)) {
      next.delete(layerId);
    } else {
      next.add(layerId);
    }
    onLayersChange(next);
  }

  const showLayers = !HIDE_LAYERS.has(view);
  const showPeriod = SHOW_PERIOD_NAV.has(view);
  const showPeriodLabel = !HIDE_PERIOD_LABEL.has(view);
  const showSearch =
    SHOW_CALENDAR_SEARCH.has(view) && onSearchQueryChange != null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cos-border pb-[18px]">
        <div>
          <h1 className="font-display text-[34px] leading-none font-semibold tracking-[-0.025em] text-cos-text">
            Calendar
          </h1>
          <p className="mt-1.5 max-w-[500px] text-sm leading-relaxed text-cos-muted">
            One quiet place for organization events, scheduled posts, and the
            best times to reach your community.
          </p>
        </div>
        {!compact ? (
          <button
            type="button"
            onClick={() => onViewChange("import")}
            className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-[18px] py-[11px] text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
          >
            Bring in calendar <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <nav
          className="flex flex-wrap items-center gap-1"
          role="tablist"
          aria-label="Calendar views"
        >
          {VIEW_OPTIONS.map((option) => {
            const active = view === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onViewChange(option.value)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13px] font-bold transition",
                  active
                    ? "bg-cos-card text-cos-text shadow-[0_3px_10px_rgba(42,38,34,0.05)] ring-1 ring-cos-border"
                    : "text-cos-muted hover:bg-[rgba(255,252,247,0.7)] hover:text-cos-text",
                  active && option.heat
                    ? "shadow-[0_0_0_3px_rgba(196,146,46,0.18)]"
                    : null,
                )}
              >
                {option.label}
              </button>
            );
          })}
        </nav>

        {showSearch ? (
          <label className="relative block w-full max-w-[210px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-cos-muted" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search events, times, dates…"
              aria-label="Search events, times, and dates"
              className="w-full rounded-full border border-cos-border bg-cos-card py-2 pr-3 pl-9 text-[13px] text-cos-text placeholder:text-cos-muted focus:border-cos-accent focus:outline-none"
            />
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {showLayers ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-0.5 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
              Show
            </span>
            {UNIFIED_CALENDAR_LAYERS.map((layer) => {
              const active = activeLayers.has(layer.id);
              const resolved = layerColors[layer.id];
              return (
                <div
                  key={layer.id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-1 text-xs font-bold transition",
                    active
                      ? "border-cos-border bg-cos-card text-cos-text shadow-[0_8px_28px_rgba(28,36,48,0.06)]"
                      : "border-transparent bg-transparent text-cos-muted",
                  )}
                >
                  {onLayerColorChange ? (
                    <DashboardWidgetColorPicker
                      label={layer.label}
                      value={layerColorOverrides[layer.id] ?? null}
                      swatchColor={resolved}
                      variant="dot"
                      onChange={(color) => onLayerColorChange(layer.id, color)}
                    />
                  ) : (
                    <span
                      className="m-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: resolved }}
                      aria-hidden
                    />
                  )}
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      "rounded-full px-2 py-1 transition",
                      active
                        ? "text-cos-text"
                        : "text-cos-muted hover:text-cos-text",
                    )}
                  >
                    {layer.label}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <span />
        )}

        {showPeriod ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              aria-label="Previous period"
              className="grid h-9 w-9 place-items-center rounded-full border border-cos-border bg-cos-card text-cos-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-full border border-cos-border bg-cos-card px-3.5 py-2 text-xs font-bold text-cos-text"
            >
              Today
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="Next period"
              className="grid h-9 w-9 place-items-center rounded-full border border-cos-border bg-cos-card text-cos-text"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <h2 className="ml-1 font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
              {periodLabel}
            </h2>
          </div>
        ) : showPeriodLabel ? (
          <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em] text-cos-text">
            {periodLabel}
          </h2>
        ) : null}
      </div>

      {view === "week" && postingHeatmap != null ? (
        <button
          type="button"
          onClick={() => onViewChange("best-times")}
          className="inline-flex items-center rounded-full border-[1.5px] border-cos-border bg-cos-card px-4 py-2.5 text-[13px] font-bold text-cos-text transition hover:-translate-y-px"
        >
          Show best times →
        </button>
      ) : null}

      {view === "best-times" && postingHeatmap != null ? (
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-cos-border bg-[rgba(255,252,247,0.65)] px-3.5 py-3 text-xs text-cos-muted">
          <strong className="font-display text-[15px] font-semibold text-cos-text">
            Best times to post
          </strong>
          <span>Darker = people more likely to see posts</span>
          <span
            className="inline-flex h-2.5 w-[88px] overflow-hidden rounded-full border border-cos-border"
            aria-hidden
          >
            <span className="flex-1 bg-[rgb(248,236,220)]" />
            <span className="flex-1 bg-[rgb(236,214,182)]" />
            <span className="flex-1 bg-[rgb(214,178,132)]" />
            <span className="flex-1 bg-[rgb(184,149,111)]" />
          </span>
          <span>Low → High</span>
          <span className="ml-auto font-bold text-cos-muted">
            {heatmapSourceLabel(postingHeatmap)}
          </span>
        </div>
      ) : null}

      {view === "best-times" && postingHeatmap == null ? (
        <p className="rounded-2xl border border-cos-border bg-[rgba(255,252,247,0.55)] px-4 py-3 text-sm text-cos-muted">
          Connect Meta publishing to learn the best times for your community.
          Showing the week grid until then.
        </p>
      ) : null}
    </div>
  );
}
