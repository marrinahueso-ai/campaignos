"use client";

import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import {
  getDefaultActiveLayers,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import {
  enrichPreviewCalendarItems,
  PREVIEW_TODAY,
  previewCalendarItems,
  previewPostingHeatmap,
} from "@/lib/marketing/feature-preview-fixtures";
import { useMemo, useState } from "react";

interface FeaturePreviewHeatmapSlideProps {
  interactive?: boolean;
  initialHeatmapEnabled?: boolean;
  compact?: boolean;
}

export function FeaturePreviewHeatmapSlide({
  interactive = false,
  initialHeatmapEnabled = true,
  compact = false,
}: FeaturePreviewHeatmapSlideProps) {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers(),
  );
  const [view, setView] = useState<"week" | "best-times">(
    initialHeatmapEnabled ? "best-times" : "week",
  );

  const enrichedItems = useMemo(
    () => enrichPreviewCalendarItems(previewCalendarItems),
    [],
  );

  const showPostingHeatmap = view === "best-times";

  return (
    <div className="space-y-3" data-record-step="calendar-heatmap">
      <UnifiedCalendarControlPanel
        view={view}
        periodLabel="Jun 29 – Jul 5, 2026"
        activeLayers={activeLayers}
        showImportList={false}
        postingHeatmap={previewPostingHeatmap}
        showPostingHeatmap={showPostingHeatmap}
        onViewChange={(next) => {
          if (next === "week" || next === "best-times") {
            setView(next);
          }
        }}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onLayersChange={setActiveLayers}
        compact={compact}
      />
      <div className={interactive ? undefined : "pointer-events-none"}>
        <PlanningCalendarWeekView
          items={enrichedItems}
          anchorDate={PREVIEW_TODAY}
          postingHeatmap={previewPostingHeatmap}
          showPostingHeatmap={showPostingHeatmap}
          onSelectItem={() => {}}
          onOptimisticReschedule={() => {}}
          onRescheduleFailed={() => {}}
          onRescheduled={() => {}}
        />
      </div>
    </div>
  );
}
