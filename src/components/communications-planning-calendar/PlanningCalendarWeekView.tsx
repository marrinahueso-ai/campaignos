"use client";

import { useCallback, useState, useTransition } from "react";
import { reschedulePlanningItemAction } from "@/lib/communications-calendar/planning-actions";
import { UnifiedCalendarDayContent } from "@/components/unified-calendar/UnifiedCalendarDayContent";
import {
  DRAG_MIME,
  parseDragPayload,
} from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { getWeekDates } from "@/lib/communications-calendar/workload";
import { cn } from "@/lib/utils/cn";
import { formatLocalDate, getTodayDateString, normalizeDateOnly, parseLocalDate } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PlanningCalendarWeekViewProps {
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[];
  anchorDate: string;
  onSelectItem: (item: PlanningCalendarItem) => void;
  onRescheduled: () => void;
}

export function PlanningCalendarWeekView({
  items,
  anchorDate,
  onSelectItem,
  onRescheduled,
}: PlanningCalendarWeekViewProps) {
  const today = getTodayDateString();
  const weekDates = getWeekDates(anchorDate);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const itemsByDate = groupItemsByDate(items);

  const handleDrop = useCallback(
    (date: string, event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropTarget(null);
      const raw = event.dataTransfer.getData(DRAG_MIME);
      const payload = parseDragPayload(raw);
      if (!payload) return;

      startTransition(async () => {
        const result = await reschedulePlanningItemAction({
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          newDate: date,
          eventId: payload.eventId,
          timelineStepId: payload.timelineStepId,
          channel: payload.channel,
        });
        if (result.success) onRescheduled();
      });
    },
    [onRescheduled],
  );

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm",
        isPending && "opacity-80",
      )}
    >
      <div className="grid grid-cols-7 border-b border-cos-border bg-cos-bg">
        {weekDates.map((date) => {
          const dateObj = parseLocalDate(date);
          return (
            <div key={date} className="px-3 py-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-cos-muted">
                {formatLocalDate(date, { weekday: "short" })}
              </p>
              <p
                className={cn(
                  "mx-auto mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  date === today ? "bg-cos-primary text-white" : "text-cos-text",
                )}
              >
                {dateObj.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid min-h-[480px] grid-cols-7">
        {weekDates.map((date) => {
          const dayItems = itemsByDate.get(date) ?? [];
          return (
            <div
              key={date}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(date);
              }}
              onDragLeave={() => setDropTarget((current) => (current === date ? null : current))}
              onDrop={(event) => handleDrop(date, event)}
              className={cn(
                "border-r border-cos-border p-3 last:border-r-0",
                date === today && "bg-cos-accent-soft/30",
                dropTarget === date && "bg-cos-accent-soft ring-2 ring-inset ring-indigo-300",
              )}
            >
              <UnifiedCalendarDayContent
                items={dayItems}
                onSelectItem={onSelectItem}
                itemLimit={8}
              />
              {dayItems.length === 0 && (
                <p className="py-8 text-center text-xs text-cos-border">Drop here</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupItemsByDate(
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[],
) {
  const map = new Map<string, typeof items>();
  for (const item of items) {
    const dateKey = normalizeDateOnly(item.scheduledDate);
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  }
  return map;
}
