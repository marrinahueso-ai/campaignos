import type { WorkloadLevel } from "@/types/communications-calendar";
import {
  addDaysToDateOnly,
  parseLocalDate,
  toLocalDateString,
} from "@/lib/utils/dates";

export function getWorkloadLevel(itemCount: number): WorkloadLevel {
  if (itemCount <= 0) return "calm";
  if (itemCount <= 2) return "light";
  if (itemCount <= 4) return "busy";
  return "overloaded";
}

export function getMonthGridDates(year: number, month: number): string[] {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return toLocalDateString(date);
  });
}

export function getWeekDates(anchorDate: string): string[] {
  const date = parseLocalDate(anchorDate);
  const day = date.getDay();
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - day);

  return Array.from({ length: 7 }, (_, index) => {
    const entry = new Date(weekStart);
    entry.setDate(weekStart.getDate() + index);
    return toLocalDateString(entry);
  });
}

export function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatWeekRange(dates: string[]): string {
  if (dates.length === 0) return "";
  const start = parseLocalDate(dates[0]!);
  const end = parseLocalDate(dates[dates.length - 1]!);
  const sameMonth = start.getMonth() === end.getMonth();

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${startLabel} – ${endLabel}`;
}

export function addMonths(year: number, month: number, delta: number): {
  year: number;
  month: number;
} {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function addWeeks(anchorDate: string, delta: number): string {
  return addDaysToDateOnly(anchorDate, delta * 7);
}

export function getDaySummary<T extends {
  date: string;
  eventCount: number;
  communicationCount: number;
  draftCount: number;
  workload: WorkloadLevel;
  workloadTotal: number;
}>(summaries: T[], date: string): T {
  return (
    summaries.find((entry) => entry.date === date) ?? ({
      date,
      eventCount: 0,
      communicationCount: 0,
      draftCount: 0,
      workload: "calm",
      workloadTotal: 0,
    } as T)
  );
}
