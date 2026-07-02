"use client";

import { UnifiedCalendarDayContent } from "@/components/unified-calendar/UnifiedCalendarDayContent";
import { formatLocalDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PlanningCalendarAgendaViewProps {
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[];
  onSelectItem: (item: PlanningCalendarItem) => void;
}

export function PlanningCalendarAgendaView({
  items,
  onSelectItem,
}: PlanningCalendarAgendaViewProps) {
  const sorted = [...items].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate),
  );

  const grouped = sorted.reduce<
    Record<string, (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[]>
  >((acc, item) => {
    acc[item.scheduledDate] = acc[item.scheduledDate] ?? [];
    acc[item.scheduledDate].push(item);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cos-border bg-cos-card px-6 py-16 text-center">
        <p className="text-sm font-medium text-cos-text">
          Nothing needs your attention right now
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-cos-muted">
          Turn on more layers or add events when you&apos;re ready.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {dates.map((date) => (
        <section
          key={date}
          className="overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm"
        >
          <header
            className={cn(
              "border-b border-cos-border px-5 py-3",
              grouped[date][0]?.isToday && "bg-cos-accent-soft/60",
            )}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-cos-text">
                {formatAgendaDate(date)}
              </h3>
              {grouped[date][0]?.isToday && (
                <span className="rounded-full bg-cos-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  Today
                </span>
              )}
              <span className="text-xs text-cos-dark-muted">
                {grouped[date].length} item{grouped[date].length === 1 ? "" : "s"}
              </span>
            </div>
          </header>

          <div className="px-4 py-4">
            <UnifiedCalendarDayContent
              items={grouped[date]}
              onSelectItem={onSelectItem}
              itemLimit={50}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function formatAgendaDate(date: string): string {
  return formatLocalDate(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
