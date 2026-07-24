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
  const [showPostingHeatmap, setShowPostingHeatmap] = useState(initialHeatmapEnabled);

  const enrichedItems = useMemo(
    () => enrichPreviewCalendarItems(previewCalendarItems),
    [],
  );

  return (
    <div className="space-y-3" data-record-step="calendar-heatmap">
      <UnifiedCalendarControlPanel
        view="week"
        periodLabel="Jun 29 – Jul 5, 2026"
        activeLayers={activeLayers}
        upcomingItems={enrichedItems.slice(0, 4)}
        showImportList={false}
        postingHeatmap={previewPostingHeatmap}
        showPostingHeatmap={showPostingHeatmap}
        onShowPostingHeatmapChange={setShowPostingHeatmap}
        onViewChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onLayersChange={setActiveLayers}
        onSelectUpcomingItem={() => {}}
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
