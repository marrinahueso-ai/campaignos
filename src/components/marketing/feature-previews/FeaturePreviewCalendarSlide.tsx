"use client";

import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import {
  getDefaultActiveLayers,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import {
  enrichPreviewCalendarItems,
  previewMonthCalendarItems,
} from "@/lib/marketing/feature-preview-fixtures";
import { useMemo, useState } from "react";

interface FeaturePreviewCalendarSlideProps {
  interactive?: boolean;
}

export function FeaturePreviewCalendarSlide({
  interactive = false,
}: FeaturePreviewCalendarSlideProps) {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers(),
  );

  const enrichedItems = useMemo(
    () => enrichPreviewCalendarItems(previewMonthCalendarItems),
    [],
  );

  return (
    <div className="space-y-3" data-record-step="calendar-month">
      <UnifiedCalendarControlPanel
        view="month"
        periodLabel="July 2026"
        activeLayers={activeLayers}
        upcomingItems={enrichedItems.slice(0, 4)}
        showImportList={false}
        onViewChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onLayersChange={setActiveLayers}
        onSelectUpcomingItem={() => {}}
      />
      <div className={interactive ? undefined : "pointer-events-none"}>
        <PlanningCalendarMonthView
          items={enrichedItems}
          year={2026}
          month={6}
          onSelectItem={() => {}}
          onOptimisticReschedule={() => {}}
          onRescheduleFailed={() => {}}
          onRescheduled={() => {}}
        />
      </div>
    </div>
  );
}
