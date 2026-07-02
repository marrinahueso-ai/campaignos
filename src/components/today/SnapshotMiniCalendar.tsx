"use client";

import type { TodayWeekEntry } from "@/types/today";

interface SnapshotMiniCalendarProps {
  today: string;
  entries: TodayWeekEntry[];
  approvalDates?: string[];
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const TOOLTIP_ITEM_LIMIT = 4;

export function SnapshotMiniCalendar({
  today,
  entries,
  approvalDates = [],
}: SnapshotMiniCalendarProps) {
  const { year, month } = parseDate(today);
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const days = buildMonthDays(year, month);
  const entriesByDate = groupEntriesByDate(entries);
  const approvalDateSet = new Set(approvalDates);

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
          const hasApproval = approvalDateSet.has(day.date);
          const dots = dotKinds(dayEntries, hasApproval);
          const isToday = day.date === today;
          const hasActivity = dayEntries.length > 0 || hasApproval;

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
                <DayTooltip
                  date={day.date}
                  entries={dayEntries}
                  hasApproval={hasApproval}
                />
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

              {dots.length > 0 && (
                <span className="flex gap-0.5" aria-hidden>
                  {dots.map((color, dotIndex) => (
                    <span
                      key={`${day.date}-${color}-${dotIndex}`}
                      className={`h-1 w-1 rounded-full ${dotColorClass(color)}`}
                    />
                  ))}
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
  hasApproval: boolean;
}

function DayTooltip({ date, entries, hasApproval }: DayTooltipProps) {
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
              {entryLabel(entry)}
            </li>
          ))}
          {hasApproval && (
            <li className="text-xs leading-snug text-cos-muted">Approval in progress</li>
          )}
          {remaining > 0 && (
            <li className="text-xs text-cos-muted">+{remaining} more</li>
          )}
        </ul>
      </div>
    </div>
  );
}

type DotColor = "sage" | "accent" | "sand";

function dotKinds(entries: TodayWeekEntry[], hasApproval: boolean): DotColor[] {
  const dots: DotColor[] = [];

  if (entries.some((entry) => entry.kind === "event")) {
    dots.push("sage");
  }
  if (
    entries.some(
      (entry) => entry.kind === "communication" || entry.kind === "publishing",
    )
  ) {
    dots.push("accent");
  }
  if (hasApproval) {
    dots.push("sand");
  }

  return dots.slice(0, 3);
}

function dotColorClass(color: DotColor): string {
  switch (color) {
    case "sage":
      return "bg-cos-success";
    case "accent":
      return "bg-cos-accent";
    case "sand":
      return "bg-cos-warning-text/60";
  }
}

function entryLabel(entry: TodayWeekEntry): string {
  if (entry.kind === "event") return entry.title;
  if (entry.kind === "publishing") return "Ready to publish";
  if (entry.eventTitle && !entry.title.includes(entry.eventTitle)) {
    return `${entry.title} · ${entry.eventTitle}`;
  }
  return entry.title.length > 48 ? `${entry.title.slice(0, 45)}…` : entry.title;
}

function tooltipDayLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
