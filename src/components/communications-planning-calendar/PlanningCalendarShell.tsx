"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanningCalendarAgendaView } from "@/components/communications-planning-calendar/PlanningCalendarAgendaView";
import { PlanningCalendarDetailPanel } from "@/components/communications-planning-calendar/PlanningCalendarDetailPanel";
import {
  ChannelLegend,
  PlanningCalendarFiltersBar,
} from "@/components/communications-planning-calendar/PlanningCalendarFilters";
import type { PlanningDragPayload } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import { PlanningCalendarToolbar } from "@/components/communications-planning-calendar/PlanningCalendarToolbar";
import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
import {
  applyOptimisticReschedule,
  matchesDragPayload,
} from "@/components/communications-planning-calendar/planning-calendar-dnd";
import { UpcomingDeadlinesStrip } from "@/components/communications-planning-calendar/UpcomingDeadlinesStrip";
import { DEFAULT_FILTERS } from "@/lib/communications-calendar/channel-styles";
import {
  enrichItemFlags,
  filterPlanningItems,
  getUpcomingItems,
} from "@/lib/communications-calendar/planning-utils";
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
  formatWeekRange,
  getWeekDates,
} from "@/lib/communications-calendar/workload";
import { getTodayDateString } from "@/lib/utils/dates";
import type {
  PlanningCalendarData,
  PlanningCalendarFilters,
  PlanningCalendarItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";

interface PlanningCalendarShellProps {
  data: PlanningCalendarData;
}

export function PlanningCalendarShell({ data }: PlanningCalendarShellProps) {
  const router = useRouter();
  const today = getTodayDateString();
  const todayDate = new Date(`${today}T12:00:00`);

  const [view, setView] = useState<PlanningCalendarView>("month");
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [filters, setFilters] = useState<PlanningCalendarFilters>(DEFAULT_FILTERS);
  const [selectedItem, setSelectedItem] = useState<PlanningCalendarItem | null>(null);
  const [localItems, setLocalItems] = useState(data.items);
  const itemsSnapshotRef = useRef(data.items);

  useEffect(() => {
    setLocalItems(data.items);
    itemsSnapshotRef.current = data.items;
  }, [data.items]);

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setView("agenda");
    }
  }, []);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of localItems) {
      map.set(item.eventId, item.eventTitle);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [localItems]);

  const enrichedItems = useMemo(
    () => localItems.map((item) => enrichItemFlags(item, today)),
    [localItems, today],
  );

  const filteredItems = useMemo(
    () => filterPlanningItems(enrichedItems, filters),
    [enrichedItems, filters],
  );

  const upcomingItems = useMemo(
    () =>
      getUpcomingItems(filteredItems, today, 7).map((item) =>
        enrichItemFlags(item, today),
      ),
    [filteredItems, today],
  );

  const periodLabel = useMemo(() => {
    if (view === "month") return formatMonthLabel(year, month);
    if (view === "week") return formatWeekRange(getWeekDates(weekAnchor));
    return "Communications Agenda";
  }, [view, year, month, weekAnchor]);

  function goToday() {
    const now = new Date(`${getTodayDateString()}T12:00:00`);
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setWeekAnchor(getTodayDateString());
  }

  function goPrevious() {
    if (view === "month") {
      const next = addMonths(year, month, -1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    if (view === "week") {
      setWeekAnchor(addWeeks(weekAnchor, -1));
    }
  }

  function goNext() {
    if (view === "month") {
      const next = addMonths(year, month, 1);
      setYear(next.year);
      setMonth(next.month);
      return;
    }
    if (view === "week") {
      setWeekAnchor(addWeeks(weekAnchor, 1));
    }
  }

  const handleOptimisticReschedule = useCallback(
    (payload: PlanningDragPayload, date: string, hour?: number) => {
      const timezone = data.postingHeatmap?.timezone ?? "America/Chicago";
      setLocalItems((current) => {
        itemsSnapshotRef.current = current;
        return current.map((item) =>
          matchesDragPayload(item, payload)
            ? applyOptimisticReschedule(item, date, hour, timezone)
            : item,
        );
      });
    },
    [data.postingHeatmap?.timezone],
  );

  const handleRescheduleFailed = useCallback((_payload: PlanningDragPayload) => {
    setLocalItems(itemsSnapshotRef.current);
  }, []);

  const handleRescheduled = useCallback(() => {
    router.refresh();
  }, [router]);

  const selectedEnriched =
    selectedItem &&
    enrichedItems.find((entry) => entry.id === selectedItem.id);

  return (
    <>
      <div className="space-y-6">
        <PlanningCalendarToolbar
          view={view}
          periodLabel={periodLabel}
          onViewChange={setView}
          onPrevious={goPrevious}
          onNext={goNext}
          onToday={goToday}
        />

        <UpcomingDeadlinesStrip
          items={upcomingItems}
          onSelectItem={setSelectedItem}
        />

        <PlanningCalendarFiltersBar
          filters={filters}
          events={events}
          onChange={setFilters}
        />

        <ChannelLegend />

        {view === "month" && (
          <PlanningCalendarMonthView
            items={filteredItems}
            year={year}
            month={month}
            onSelectItem={setSelectedItem}
            onOptimisticReschedule={handleOptimisticReschedule}
            onRescheduleFailed={handleRescheduleFailed}
            onRescheduled={handleRescheduled}
          />
        )}
        {view === "week" && (
          <PlanningCalendarWeekView
            items={filteredItems}
            anchorDate={weekAnchor}
            onSelectItem={setSelectedItem}
            onOptimisticReschedule={handleOptimisticReschedule}
            onRescheduleFailed={handleRescheduleFailed}
            onRescheduled={handleRescheduled}
          />
        )}
        {view === "agenda" && (
          <PlanningCalendarAgendaView
            items={filteredItems}
            onSelectItem={setSelectedItem}
          />
        )}
      </div>

      {selectedEnriched && (
        <>
          <button
            type="button"
            aria-label="Close detail panel overlay"
            className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[1px]"
            onClick={() => setSelectedItem(null)}
          />
          <PlanningCalendarDetailPanel
            item={selectedEnriched}
            onClose={() => setSelectedItem(null)}
          />
        </>
      )}
    </>
  );
}
