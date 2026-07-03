"use client";

import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import {
  getDefaultActiveLayers,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import {
  PREVIEW_TODAY,
  previewCalendarItems,
  previewPostingHeatmap,
} from "@/lib/marketing/feature-preview-fixtures";
import { useMemo, useState } from "react";

export function FeaturePreviewHeatmapSlide() {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers(),
  );
  const [showPostingHeatmap, setShowPostingHeatmap] = useState(true);

  const enrichedItems = useMemo(
    () =>
      previewCalendarItems.map((item) => ({
        ...item,
        isOverdue: false,
        isToday: item.scheduledDate === PREVIEW_TODAY,
      })),
    [],
  );

  return (
    <div className="space-y-4">
      <UnifiedCalendarControlPanel
        view="week"
        periodLabel="Jun 29 – Jul 5, 2026"
        activeLayers={activeLayers}
        upcomingItems={enrichedItems.slice(0, 3)}
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
      />
      <div className="pointer-events-none">
        <PlanningCalendarWeekView
          items={enrichedItems}
          anchorDate={PREVIEW_TODAY}
          postingHeatmap={previewPostingHeatmap}
          showPostingHeatmap={showPostingHeatmap}
          onSelectItem={() => {}}
          onRescheduled={() => {}}
        />
      </div>
    </div>
  );
}
