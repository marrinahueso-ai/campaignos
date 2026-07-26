"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import type { PlanningDragPayload } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import {
  captureDropPayload,
  clearDropTargetActive,
  executeRescheduleDrop,
  setDropTargetActive,
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
  onOptimisticReschedule: (payload: PlanningDragPayload, date: string) => void;
  onRescheduleFailed: (payload: PlanningDragPayload) => void;
  onRescheduled: () => void;
}

export function PlanningCalendarMonthView({
  items,
  year,
  month,
  onSelectItem,
  onOptimisticReschedule,
  onRescheduleFailed,
  onRescheduled,
}: PlanningCalendarMonthViewProps) {
  const today = getTodayDateString();
  const dates = useMemo(() => getMonthGridDates(year, month), [year, month]);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "warning">(
    "error",
  );
  const { handleDragOver } = useCalendarDragState();

  const itemsByDate = useMemo(() => groupItemsByDate(items), [items]);

  const showToast = useCallback(
    (message: string, variant: "error" | "success" | "warning") => {
      setToastVariant(variant);
      setToastMessage(message);
    },
    [],
  );

  const handleDragError = useCallback(
    (message: string) => showToast(message, "error"),
    [showToast],
  );

  const handleDrop = useCallback(
    (date: string, event: React.DragEvent<HTMLDivElement>) => {
      clearDropTargetActive(event.currentTarget);
      const payload = captureDropPayload(event);

      if (!payload) {
        showToast("Could not read the dragged item. Try again.", "error");
        return;
      }

      onOptimisticReschedule(payload, date);

      void executeRescheduleDrop({
        date,
        payload,
        onRescheduled,
        onSuccess: (message) => showToast(message, "success"),
        onWarning: (message) => showToast(message, "warning"),
        onError: (message) => {
          onRescheduleFailed(payload);
          showToast(message, "error");
        },
      });
    },
    [onOptimisticReschedule, onRescheduleFailed, onRescheduled, showToast],
  );

  return (
    <>
      <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        Month glance
      </p>
      <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="grid grid-cols-7 border-b border-cos-border bg-[rgba(255,252,247,0.65)]">
          {weekdays.map((day) => (
            <div
              key={day}
              className="px-2 py-2.5 text-center text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {dates.map((date, index) => {
            const dateObj = parseLocalDate(date);
            const inMonth = dateObj.getMonth() === month;
            const dayItems = itemsByDate.get(date) ?? [];
            const isToday = date === today;
            const isLastCol = (index + 1) % 7 === 0;

            return (
              <div
                key={date}
                data-testid={`calendar-drop-month-${date}`}
                onDragEnter={(event) => {
                  handleDragOver(event);
                  setDropTargetActive(event.currentTarget, true);
                }}
                onDragOver={(event) => {
                  handleDragOver(event);
                  setDropTargetActive(event.currentTarget, true);
                }}
                onDragLeave={(event) => {
                  const next = event.relatedTarget;
                  if (
                    next instanceof Node &&
                    event.currentTarget.contains(next)
                  ) {
                    return;
                  }
                  setDropTargetActive(event.currentTarget, false);
                }}
                onDrop={(event) => handleDrop(date, event)}
                className={cn(
                  "calendar-drop-target relative min-h-[118px] border-b border-cos-border p-2",
                  !isLastCol && "border-r border-cos-border",
                  !inMonth && "opacity-45",
                  isToday
                    ? "bg-[radial-gradient(ellipse_at_top_left,rgba(47,74,60,0.08),transparent_60%),#fffcf7]"
                    : "bg-[rgba(255,252,247,0.35)]",
                )}
              >
                <div className="mb-1.5">
                  <span
                    className={cn(
                      "text-xs font-extrabold text-cos-muted",
                      isToday &&
                        "inline-grid h-6 w-6 place-items-center rounded-full bg-[#2f4a3c] text-[12px] text-[#f6f2eb]",
                    )}
                  >
                    {dateObj.getDate()}
                  </span>
                </div>

                <UnifiedCalendarDayContent
                  items={dayItems}
                  onSelectItem={onSelectItem}
                  onDragError={handleDragError}
                  compact
                  itemLimit={5}
                  ease
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
