"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { PlanningCalendarItemChip } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { reschedulePlanningItemAction } from "@/lib/communications-calendar/planning-actions";
import {
  DRAG_MIME,
  parseDragPayload,
} from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import { getScoreForCell } from "@/lib/posting-analytics/compute-heatmap";
import {
  formatHourLabel,
  heatmapCellBackground,
  heatmapDropTargetBackground,
  resolveItemHour,
} from "@/lib/posting-analytics/heatmap-ui";
import {
  WEEK_VIEW_END_HOUR,
  WEEK_VIEW_START_HOUR,
  type PostingHeatmapData,
} from "@/lib/posting-analytics/types";
import { getWeekDates } from "@/lib/communications-calendar/workload";
import { cn } from "@/lib/utils/cn";
import {
  formatLocalDate,
  getDayOfWeek,
  getTodayDateString,
  normalizeDateOnly,
  parseLocalDate,
} from "@/lib/utils/dates";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

type EnrichedItem = PlanningCalendarItem & { isOverdue: boolean; isToday: boolean };

type DropTarget =
  | { date: string; hour: "allday" }
  | { date: string; hour: number };

interface PlanningCalendarWeekViewProps {
  items: EnrichedItem[];
  anchorDate: string;
  onSelectItem: (item: PlanningCalendarItem) => void;
  onRescheduled: () => void;
  postingHeatmap?: PostingHeatmapData | null;
  showPostingHeatmap?: boolean;
}

const HOUR_ROWS = Array.from(
  { length: WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1 },
  (_, index) => WEEK_VIEW_START_HOUR + index,
);

function dropTargetKey(target: DropTarget | null): string | null {
  if (!target) {
    return null;
  }

  return `${target.date}:${target.hour}`;
}

function matchesDropTarget(
  target: DropTarget | null,
  date: string,
  hour: DropTarget["hour"],
): boolean {
  return target?.date === date && target.hour === hour;
}

function readDragPayload(event: React.DragEvent): ReturnType<typeof parseDragPayload> {
  const raw =
    event.dataTransfer.getData(DRAG_MIME) ||
    event.dataTransfer.getData("text/plain");
  return parseDragPayload(raw);
}

export function PlanningCalendarWeekView({
  items,
  anchorDate,
  onSelectItem,
  onRescheduled,
  postingHeatmap = null,
  showPostingHeatmap = true,
}: PlanningCalendarWeekViewProps) {
  const today = getTodayDateString();
  const weekDates = getWeekDates(anchorDate);
  const timezone = postingHeatmap?.timezone ?? "America/Chicago";
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function startDrag() {
      setIsDragging(true);
    }

    function endDrag() {
      setIsDragging(false);
      setDropTarget(null);
    }

    document.addEventListener("dragstart", startDrag);
    document.addEventListener("dragend", endDrag);
    document.addEventListener("drop", endDrag);
    return () => {
      document.removeEventListener("dragstart", startDrag);
      document.removeEventListener("dragend", endDrag);
      document.removeEventListener("drop", endDrag);
    };
  }, []);

  const itemsByDate = useMemo(() => groupItemsByDate(items), [items]);
  const placementByDate = useMemo(
    () => buildItemPlacement(itemsByDate, timezone),
    [itemsByDate, timezone],
  );

  const handleDrop = useCallback(
    (date: string, hour: DropTarget["hour"], event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropTarget(null);
      setIsDragging(false);
      const payload = readDragPayload(event);
      if (!payload) return;

      startTransition(async () => {
        const result = await reschedulePlanningItemAction({
          sourceType: payload.sourceType,
          sourceId: payload.sourceId,
          newDate: date,
          eventId: payload.eventId,
          timelineStepId: payload.timelineStepId,
          channel: payload.channel,
          ...(typeof hour === "number"
            ? { newHour: hour, timezone }
            : {}),
        });
        if (result.success) onRescheduled();
      });
    },
    [onRescheduled, timezone],
  );

  const handleDragOver = useCallback(
    (date: string, hour: DropTarget["hour"], event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setIsDragging(true);
      setDropTarget({ date, hour });
    },
    [],
  );

  const activeDropKey = dropTargetKey(dropTarget);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-cos-border bg-white shadow-sm",
        isPending && "opacity-80",
      )}
    >
      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-cos-border bg-cos-bg">
        <div aria-hidden className="border-r border-cos-border" />
        {weekDates.map((date) => {
          const dateObj = parseLocalDate(date);
          return (
            <div key={date} className="border-r border-cos-border px-2 py-3 text-center last:border-r-0">
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

      <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
        <div className="border-r border-cos-border bg-cos-bg/40">
          <div className="flex h-16 items-center justify-end border-b border-cos-border/70 px-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-cos-muted">
              All day
            </span>
          </div>
          {HOUR_ROWS.map((hour) => (
            <div
              key={hour}
              className="flex h-12 items-start justify-end border-b border-cos-border/60 px-2 pt-1"
            >
              <span className="text-[10px] font-medium text-cos-muted">
                {formatHourLabel(hour)}
              </span>
            </div>
          ))}
        </div>

        {weekDates.map((date) => {
          const dayOfWeek = getDayOfWeek(date);
          const placement = placementByDate.get(date) ?? { allDay: [], byHour: new Map() };
          const isTodayColumn = date === today;

          return (
            <div
              key={date}
              className={cn(
                "border-r border-cos-border last:border-r-0",
                isTodayColumn && "bg-cos-accent-soft/20",
              )}
            >
              <div
                onDragOver={(event) => handleDragOver(date, "allday", event)}
                onDragLeave={() =>
                  setDropTarget((current) =>
                    matchesDropTarget(current, date, "allday") ? null : current,
                  )
                }
                onDrop={(event) => handleDrop(date, "allday", event)}
                className={cn(
                  "min-h-16 border-b border-cos-border/70 p-1.5 transition-colors",
                  activeDropKey === `${date}:allday` &&
                    "bg-cos-accent-soft ring-2 ring-inset ring-indigo-300",
                )}
              >
                {placement.allDay.length > 0 ? (
                  <div className={cn("space-y-1", isDragging && "pointer-events-none")}>
                    {placement.allDay.slice(0, 4).map((item) => (
                      <PlanningCalendarItemChip
                        key={item.id}
                        item={item}
                        compact
                        onSelect={onSelectItem}
                      />
                    ))}
                    {placement.allDay.length > 4 && (
                      <p className="px-1 text-[10px] font-medium text-cos-primary">
                        +{placement.allDay.length - 4} more
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="py-4 text-center text-[10px] text-cos-border">Drop here</p>
                )}
              </div>

              {HOUR_ROWS.map((hour) => {
                const score =
                  showPostingHeatmap && postingHeatmap
                    ? getScoreForCell(postingHeatmap.scores, dayOfWeek, hour)
                    : 0;
                const hourItems: EnrichedItem[] = placement.byHour.get(hour) ?? [];
                const isDropTarget = activeDropKey === `${date}:${hour}`;
                const heatmapBackground = showPostingHeatmap
                  ? heatmapCellBackground(score)
                  : undefined;

                return (
                  <div
                    key={`${date}-${hour}`}
                    className={cn(
                      "relative h-12 border-b border-cos-border/60 transition-colors",
                      isDropTarget && "z-20 ring-2 ring-inset ring-indigo-400",
                    )}
                    style={
                      heatmapBackground
                        ? { backgroundColor: heatmapBackground }
                        : isDropTarget
                          ? { backgroundColor: heatmapDropTargetBackground() }
                          : undefined
                    }
                  >
                    <div
                      aria-hidden={!isDragging}
                      onDragOver={(event) => handleDragOver(date, hour, event)}
                      onDragLeave={() =>
                        setDropTarget((current) =>
                          matchesDropTarget(current, date, hour) ? null : current,
                        )
                      }
                      onDrop={(event) => handleDrop(date, hour, event)}
                      className={cn(
                        "absolute inset-0",
                        isDragging ? "z-30" : "pointer-events-none",
                      )}
                    />
                    {hourItems.length > 0 && (
                      <div
                        className={cn(
                          "absolute inset-x-0 top-0 z-10 space-y-0.5 p-0.5",
                          isDragging && "pointer-events-none",
                        )}
                      >
                        {hourItems.slice(0, 2).map((item) => (
                          <PlanningCalendarItemChip
                            key={item.id}
                            item={item}
                            compact
                            onSelect={onSelectItem}
                          />
                        ))}
                      </div>
                    )}
                    {isDropTarget && hourItems.length === 0 && (
                      <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-indigo-600">
                        {formatHourLabel(hour)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function groupItemsByDate(items: EnrichedItem[]) {
  const map = new Map<string, EnrichedItem[]>();
  for (const item of items) {
    const dateKey = normalizeDateOnly(item.scheduledDate);
    const list = map.get(dateKey) ?? [];
    list.push(item);
    map.set(dateKey, list);
  }
  return map;
}

function buildItemPlacement(
  itemsByDate: Map<string, EnrichedItem[]>,
  timezone: string,
) {
  const result = new Map<
    string,
    { allDay: EnrichedItem[]; byHour: Map<number, EnrichedItem[]> }
  >();

  for (const [date, dayItems] of itemsByDate) {
    const allDay: EnrichedItem[] = [];
    const byHour = new Map<number, EnrichedItem[]>();

    for (const item of dayItems) {
      const hour = resolveItemHour(item, timezone);
      if (
        hour === null ||
        hour < WEEK_VIEW_START_HOUR ||
        hour > WEEK_VIEW_END_HOUR
      ) {
        allDay.push(item);
        continue;
      }

      const list = byHour.get(hour) ?? [];
      list.push(item);
      byHour.set(hour, list);
    }

    result.set(date, { allDay, byHour });
  }

  return result;
}
