"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanningCalendarAgendaView } from "@/components/communications-planning-calendar/PlanningCalendarAgendaView";
import { PlanningCalendarDetailPanel } from "@/components/communications-planning-calendar/PlanningCalendarDetailPanel";
import {
  ChannelLegend,
  PlanningCalendarFiltersBar,
} from "@/components/communications-planning-calendar/PlanningCalendarFilters";
import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import { PlanningCalendarToolbar } from "@/components/communications-planning-calendar/PlanningCalendarToolbar";
import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
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

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setView("agenda");
    }
  }, []);

  const events = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of data.items) {
      map.set(item.eventId, item.eventTitle);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [data.items]);

  const enrichedItems = useMemo(
    () => data.items.map((item) => enrichItemFlags(item, today)),
    [data.items, today],
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

  function handleRescheduled() {
    router.refresh();
  }

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
            onRescheduled={handleRescheduled}
          />
        )}
        {view === "week" && (
          <PlanningCalendarWeekView
            items={filteredItems}
            anchorDate={weekAnchor}
            onSelectItem={setSelectedItem}
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
