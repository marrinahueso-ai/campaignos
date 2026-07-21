"use client";

import type { TodayWeekEntry } from "@/types/today";

interface SnapshotMiniCalendarProps {
  today: string;
  entries: TodayWeekEntry[];
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const TOOLTIP_ITEM_LIMIT = 4;

export function SnapshotMiniCalendar({
  today,
  entries,
}: SnapshotMiniCalendarProps) {
  const { year, month } = parseDate(today);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const days = buildMonthDays(year, month);
  // Dashboard mini calendar shows events only — not schedule, milestones, or posts.
  const eventEntries = entries.filter((entry) => entry.kind === "event");
  const entriesByDate = groupEntriesByDate(eventEntries);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-cos-muted">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-y-2">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-center text-[10px] font-medium text-cos-muted/70"
          >
            {label}
          </span>
        ))}
        {days.map((day, index) => {
          if (!day) {
            return <span key={`pad-${index}`} aria-hidden />;
          }

          const dayEntries = entriesByDate.get(day.date) ?? [];
          const isToday = day.date === today;
          const hasActivity = dayEntries.length > 0;

          return (
            <div
              key={day.date}
              className={
                hasActivity
                  ? "group/day relative flex flex-col items-center gap-1 py-0.5"
                  : "flex flex-col items-center gap-1 py-0.5"
              }
            >
              {hasActivity && (
                <DayTooltip date={day.date} entries={dayEntries} />
              )}

              <span
                className={
                  isToday
                    ? "flex h-7 w-7 items-center justify-center rounded-full bg-cos-success-bg text-xs font-medium text-cos-success-text ring-1 ring-cos-success/25"
                    : hasActivity
                      ? "flex h-7 w-7 items-center justify-center rounded-full text-xs text-cos-text/80 transition-colors group-hover/day:bg-cos-bg"
                      : "text-xs text-cos-text/80"
                }
              >
                {day.dayNumber}
              </span>

              {hasActivity && (
                <span className="flex gap-0.5" aria-hidden>
                  <span className="h-1 w-1 rounded-full bg-cos-success" />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DayTooltipProps {
  date: string;
  entries: TodayWeekEntry[];
}

function DayTooltip({ date, entries }: DayTooltipProps) {
  const preview = entries.slice(0, TOOLTIP_ITEM_LIMIT);
  const remaining = entries.length - preview.length;

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute top-full left-1/2 z-30 mt-2 w-48 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/day:opacity-100"
    >
      <div className="border border-cos-border bg-cos-card px-3 py-2.5 shadow-md">
        <p className="mb-1.5 text-[10px] font-medium tracking-wide text-cos-muted uppercase">
          {tooltipDayLabel(date)}
        </p>
        <ul className="space-y-1">
          {preview.map((entry) => (
            <li key={entry.id} className="text-xs leading-snug text-cos-text">
              {entry.title}
            </li>
          ))}
          {remaining > 0 && (
            <li className="text-xs text-cos-muted">+{remaining} more</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function groupEntriesByDate(entries: TodayWeekEntry[]): Map<string, TodayWeekEntry[]> {
  const map = new Map<string, TodayWeekEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return map;
}

function parseDate(date: string): { year: number; month: number } {
  const [year, month] = date.split("-").map(Number);
  return { year: year!, month: month! - 1 };
}

function buildMonthDays(
  year: number,
  month: number,
): Array<{ date: string; dayNumber: number } | null> {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();
  const cells: Array<{ date: string; dayNumber: number } | null> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ date, dayNumber: day });
  }

  return cells;
}
