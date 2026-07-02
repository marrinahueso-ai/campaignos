"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarImportCleanupPanel } from "@/components/unified-calendar/CalendarImportCleanupPanel";
import { CalendarImportPlanList } from "@/components/unified-calendar/CalendarImportPlanList";
import { UnifiedCalendarControlPanel } from "@/components/unified-calendar/UnifiedCalendarControlPanel";
import { PlanningCalendarAgendaView } from "@/components/communications-planning-calendar/PlanningCalendarAgendaView";
import { PlanningCalendarDetailPanel } from "@/components/communications-planning-calendar/PlanningCalendarDetailPanel";
import { PlanningCalendarMonthView } from "@/components/communications-planning-calendar/PlanningCalendarMonthView";
import { PlanningCalendarWeekView } from "@/components/communications-planning-calendar/PlanningCalendarWeekView";
import {
  filterItemsByLayers,
  getDefaultActiveLayers,
  isCampaignEventItem,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import {
  enrichItemFlags,
  getInitialCalendarFocus,
  getUpcomingItems,
} from "@/lib/communications-calendar/planning-utils";
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
  formatWeekRange,
  getMonthGridDates,
  getWeekDates,
} from "@/lib/communications-calendar/workload";
import { getTodayDateString, normalizeDateOnly } from "@/lib/utils/dates";
import type {
  PlanningCalendarData,
  PlanningCalendarItem,
  PlanningCalendarView,
} from "@/types/communications-calendar";

interface UnifiedCalendarShellProps {
  data: PlanningCalendarData;
}

export function UnifiedCalendarShell({ data }: UnifiedCalendarShellProps) {
  const router = useRouter();
  const today = getTodayDateString();
  const initialFocus = getInitialCalendarFocus(data.items, today);

  const [view, setView] = useState<PlanningCalendarView>("month");
  const [year, setYear] = useState(initialFocus.year);
  const [month, setMonth] = useState(initialFocus.month);
  const [weekAnchor, setWeekAnchor] = useState(initialFocus.weekAnchor);
  const [activeLayers, setActiveLayers] = useState<Set<CalendarLayerId>>(
    getDefaultActiveLayers,
  );
  const [selectedItem, setSelectedItem] = useState<PlanningCalendarItem | null>(null);
  const hasAutoFocused = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setView("agenda");
    }
  }, []);

  useEffect(() => {
    if (data.items.length === 0 || hasAutoFocused.current) {
      return;
    }

    hasAutoFocused.current = true;
    const focus = getInitialCalendarFocus(data.items, today);
    setYear(focus.year);
    setMonth(focus.month);
    setWeekAnchor(focus.weekAnchor);
  }, [data.items, today]);

  const enrichedItems = useMemo(
    () => data.items.map((item) => enrichItemFlags(item, today)),
    [data.items, today],
  );

  const filteredItems = useMemo(
    () => filterItemsByLayers(enrichedItems, activeLayers),
    [enrichedItems, activeLayers],
  );

  const monthGridDates = useMemo(
    () => (view === "month" ? getMonthGridDates(year, month) : []),
    [view, year, month],
  );

  const itemsInCurrentPeriod = useMemo(() => {
    if (view === "month") {
      const dateSet = new Set(monthGridDates);
      return filteredItems.filter((item) =>
        dateSet.has(normalizeDateOnly(item.scheduledDate)),
      );
    }

    if (view === "week") {
      const dateSet = new Set(getWeekDates(weekAnchor));
      return filteredItems.filter((item) =>
        dateSet.has(normalizeDateOnly(item.scheduledDate)),
      );
    }

    return filteredItems;
  }, [view, monthGridDates, weekAnchor, filteredItems]);

  const showEmptyPeriodHint =
    (view === "month" || view === "week") &&
    filteredItems.length > 0 &&
    itemsInCurrentPeriod.length === 0;

  const upcomingItems = useMemo(
    () =>
      getUpcomingItems(
        enrichedItems.filter(isCampaignEventItem),
        today,
        7,
      ),
    [enrichedItems, today],
  );

  function goToFirstEvent() {
    const focus = getInitialCalendarFocus(filteredItems, today);
    setYear(focus.year);
    setMonth(focus.month);
    setWeekAnchor(focus.weekAnchor);
  }

  const periodLabel = useMemo(() => {
    if (view === "import-list") {
      return data.importListFilename
        ? `Imported — ${data.importListFilename}`
        : "Imported events";
    }
    if (view === "month") return formatMonthLabel(year, month);
    if (view === "week") return formatWeekRange(getWeekDates(weekAnchor));
    return "All events";
  }, [view, year, month, weekAnchor, data.importListFilename]);

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
    <div className="mx-auto max-w-[1600px] space-y-5 pb-8">
      {data.importCleanup && (
        <CalendarImportCleanupPanel
          schoolYearLabel={data.importCleanup.schoolYearLabel}
          eventCount={data.importCleanup.eventCount}
        />
      )}

      <UnifiedCalendarControlPanel
        view={view}
        periodLabel={periodLabel}
        activeLayers={activeLayers}
        upcomingItems={upcomingItems}
        onViewChange={setView}
        onPrevious={goPrevious}
        onNext={goNext}
        onToday={goToday}
        onLayersChange={setActiveLayers}
        onSelectUpcomingItem={setSelectedItem}
      />

      {showEmptyPeriodHint && (
        <div className="rounded-2xl border border-cos-border bg-cos-accent-soft px-5 py-4 text-sm text-cos-text">
          <p className="font-medium">No events in {periodLabel}</p>
          <p className="mt-1 text-cos-text">
            Your imported dates are in other months. Use the arrows to browse, switch
            to Agenda to see everything, or jump to the first event month.
          </p>
          <button
            type="button"
            onClick={goToFirstEvent}
            className="mt-3 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-cos-text ring-1 ring-cos-border hover:bg-cos-accent-soft"
          >
            Go to first event
          </button>
        </div>
      )}

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

      {view === "import-list" && (
        <CalendarImportPlanList
          events={data.importedEvents}
          filename={data.importListFilename}
        />
      )}

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
    </div>
  );
}
