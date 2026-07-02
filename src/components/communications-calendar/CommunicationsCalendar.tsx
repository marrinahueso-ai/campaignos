"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarListView } from "@/components/communications-calendar/CalendarListView";
import { CalendarMonthView } from "@/components/communications-calendar/CalendarMonthView";
import { CalendarToolbar } from "@/components/communications-calendar/CalendarToolbar";
import { CalendarWeekView } from "@/components/communications-calendar/CalendarWeekView";
import {
  addMonths,
  addWeeks,
  formatMonthLabel,
  formatWeekRange,
  getWeekDates,
} from "@/lib/communications-calendar/workload";
import { getTodayDateString } from "@/lib/utils/dates";
import type {
  CalendarMode,
  CalendarView,
  CommunicationsCalendarData,
} from "@/types/communications-calendar";

interface CommunicationsCalendarProps {
  data: CommunicationsCalendarData;
  fixedMode?: CalendarMode;
  embedded?: boolean;
}

export function CommunicationsCalendar({
  data,
  fixedMode,
  embedded = false,
}: CommunicationsCalendarProps) {
  const today = getTodayDateString();
  const todayDate = new Date(`${today}T12:00:00`);

  const [view, setView] = useState<CalendarView>("month");
  const [mode, setMode] = useState<CalendarMode>(fixedMode ?? "communications");
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [weekAnchor, setWeekAnchor] = useState(today);

  useEffect(() => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      setView("list");
    }
  }, []);

  const periodLabel = useMemo(() => {
    if (view === "month") return formatMonthLabel(year, month);
    if (view === "week") return formatWeekRange(getWeekDates(weekAnchor));
    return "All upcoming work";
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

  return (
    <div className="space-y-6">
      <CalendarToolbar
        view={view}
        mode={mode}
        periodLabel={periodLabel}
        onViewChange={setView}
        onModeChange={setMode}
        onPrevious={goPrevious}
        onNext={goNext}
        onToday={goToday}
        fixedMode={fixedMode}
        embedded={embedded}
      />

      {view === "month" && (
        <CalendarMonthView data={data} mode={mode} year={year} month={month} />
      )}
      {view === "week" && (
        <CalendarWeekView data={data} mode={mode} anchorDate={weekAnchor} />
      )}
      {view === "list" && <CalendarListView data={data} mode={mode} />}
    </div>
  );
}
