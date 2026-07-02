"use client";

import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import {
  getDefaultActiveLayers,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import {
  PREVIEW_TODAY,
  previewCalendarItems,
} from "@/lib/marketing/feature-preview-fixtures";
import { useMemo, useState } from "react";

export function FeaturePreviewCalendarSlide() {
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers(),
  );

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
        view="month"
        periodLabel="July 2026"
        activeLayers={activeLayers}
        upcomingItems={enrichedItems.slice(0, 3)}
        showImportList={false}
        onViewChange={() => {}}
        onPrevious={() => {}}
        onNext={() => {}}
        onToday={() => {}}
        onLayersChange={setActiveLayers}
        onSelectUpcomingItem={() => {}}
      />
      <div className="pointer-events-none">
        <PlanningCalendarMonthView
          items={enrichedItems}
          year={2026}
          month={6}
          onSelectItem={() => {}}
          onRescheduled={() => {}}
        />
      </div>
    </div>
  );
}
