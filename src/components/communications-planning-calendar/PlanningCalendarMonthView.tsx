"use client";

import { useCallback, useState, useTransition } from "react";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import {
  captureDropPayload,
  executeRescheduleDrop,
  useCalendarDragState,
} from "@/components/communications-planning-calendar/planning-calendar-dnd";
import { UnifiedCalendarDayContent } from "@/components/unified-calendar/UnifiedCalendarDayContent";
import { getMonthGridDates } from "@/lib/communications-calendar/workload";
import { cn } from "@/lib/utils/cn";
import { getTodayDateString, normalizeDateOnly, parseLocalDate } from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

interface PlanningCalendarMonthViewProps {
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[];
  year: number;
  month: number;
  onSelectItem: (item: PlanningCalendarItem) => void;
  onRescheduled: () => void;
}

export function PlanningCalendarMonthView({
  items,
  year,
  month,
  onSelectItem,
  onRescheduled,
}: PlanningCalendarMonthViewProps) {
  const today = getTodayDateString();
  const dates = getMonthGridDates(year, month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "warning">(
    "error",
  );
  const { setIsDragging, handleDragOver } = useCalendarDragState();
  const [isPending, startTransition] = useTransition();

  const itemsByDate = groupItemsByDate(items);

  const showToast = useCallback(
    (message: string, variant: "error" | "success" | "warning") => {
      setToastVariant(variant);
      setToastMessage(message);
    },
    [],
  );

  const handleDrop = useCallback(
    (date: string, event: React.DragEvent<HTMLDivElement>) => {
      const payload = captureDropPayload(event);
      setDropTarget(null);
      setIsDragging(false);

      if (!payload) {
        showToast("Could not read the dragged item. Try again.", "error");
        return;
      }

      startTransition(async () => {
        await executeRescheduleDrop({
          date,
          payload,
          onRescheduled,
          onSuccess: (message) => showToast(message, "success"),
          onWarning: (message) => showToast(message, "warning"),
          onError: (message) => showToast(message, "error"),
        });
      });
    },
    [onRescheduled, setIsDragging, showToast],
  );

  return (
    <>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-cos-border bg-cos-card shadow-sm",
          isPending && "opacity-80",
        )}
      >
        <div className="grid grid-cols-7 border-b border-cos-border bg-cos-bg/60">
          {weekdays.map((day) => (
            <div
              key={day}
              className="px-3 py-3 text-center text-xs font-medium text-cos-muted"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dates.map((date) => {
            const dateObj = parseLocalDate(date);
            const inMonth = dateObj.getMonth() === month;
            const dayItems = itemsByDate.get(date) ?? [];

            return (
              <div
                key={date}
                data-testid={`calendar-drop-month-${date}`}
                onDragOver={(event) => {
                  handleDragOver(event);
                  setDropTarget(date);
                }}
                onDragLeave={() =>
                  setDropTarget((current) => (current === date ? null : current))
                }
                onDrop={(event) => handleDrop(date, event)}
                className={cn(
                  "calendar-drop-target relative min-h-48 border-b border-r border-cos-border p-2.5 last:border-r-0 transition-colors duration-200",
                  !inMonth && "bg-cos-bg/40",
                  dropTarget === date && "bg-cos-info/40 ring-2 ring-inset ring-cos-primary/30",
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                        date === today
                          ? "bg-cos-primary text-white shadow-sm"
                          : inMonth
                            ? "text-cos-text"
                            : "text-cos-muted/60",
                      )}
                    >
                      {dateObj.getDate()}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] font-medium text-cos-muted">
                        {dayItems.length}
                      </span>
                    )}
                  </div>

                  <UnifiedCalendarDayContent
                    items={dayItems}
                    onSelectItem={onSelectItem}
                    onDragError={(message) => showToast(message, "error")}
                    compact
                    itemLimit={5}
                  />
              </div>
            );
          })}
        </div>
      </div>

      <CalendarActionToast
        message={toastMessage}
        variant={toastVariant}
        onDismiss={() => setToastMessage(null)}
      />
    </>
  );
}

function groupItemsByDate(
  items: (PlanningCalendarItem & { isOverdue: boolean; isToday: boolean })[],
): Map<string, typeof items> {
  const map = new Map<string, typeof items>();
  for (const item of items) {
    const dateKey = normalizeDateOnly(item.scheduledDate);
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  }
  return map;
}
