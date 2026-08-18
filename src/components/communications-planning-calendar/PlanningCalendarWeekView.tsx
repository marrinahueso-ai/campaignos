"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarActionToast } from "@/components/communications-planning-calendar/CalendarActionToast";
import { PlanningCalendarItemChip } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import type { PlanningDragPayload } from "@/components/communications-planning-calendar/PlanningCalendarItemChip";
import {
  captureDropPayload,
  clearDropTargetActive,
  executeRescheduleDrop,
  setDropTargetActive,
  useCalendarDragState,
} from "@/components/communications-planning-calendar/planning-calendar-dnd";
import { getScoreForCell } from "@/lib/posting-analytics/compute-heatmap";
import {
  formatHourLabel,
  heatmapCellBackground,
  resolveItemHour,
} from "@/lib/posting-analytics/heatmap-ui";
import {
  WEEK_VIEW_END_HOUR,
  WEEK_VIEW_START_HOUR,
  type PostingHeatmapData,
} from "@/lib/posting-analytics/types";
import { getWeekDates } from "@/lib/communications-calendar/workload";
import { preferSearchMatches } from "@/lib/communications-calendar/calendar-home-search";
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

type DropHour = "allday" | number;

interface PlanningCalendarWeekViewProps {
  items: EnrichedItem[];
  anchorDate: string;
  highlightedItemIds?: ReadonlySet<string> | null;
  onSelectItem: (item: PlanningCalendarItem) => void;
  onOptimisticReschedule: (
    payload: PlanningDragPayload,
    date: string,
    hour?: number,
  ) => void;
  onRescheduleFailed: (payload: PlanningDragPayload) => void;
  onRescheduled: () => void;
  postingHeatmap?: PostingHeatmapData | null;
  showPostingHeatmap?: boolean;
}

const HOUR_ROWS = Array.from(
  { length: WEEK_VIEW_END_HOUR - WEEK_VIEW_START_HOUR + 1 },
  (_, index) => WEEK_VIEW_START_HOUR + index,
);

export function PlanningCalendarWeekView({
  items,
  anchorDate,
  highlightedItemIds = null,
  onSelectItem,
  onOptimisticReschedule,
  onRescheduleFailed,
  onRescheduled,
  postingHeatmap = null,
  showPostingHeatmap = true,
}: PlanningCalendarWeekViewProps) {
  const today = getTodayDateString();
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);
  const timezone = postingHeatmap?.timezone ?? "America/Chicago";
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "warning">(
    "error",
  );
  const { handleDragOver } = useCalendarDragState();

  const itemsByDate = useMemo(() => groupItemsByDate(items), [items]);
  const placementByDate = useMemo(
    () => buildItemPlacement(itemsByDate, timezone),
    [itemsByDate, timezone],
  );

  const heatmapBackgroundByCell = useMemo(() => {
    const map = new Map<string, string | undefined>();
    if (!showPostingHeatmap || !postingHeatmap) {
      return map;
    }

    for (const date of weekDates) {
      const dayOfWeek = getDayOfWeek(date);
      for (const hour of HOUR_ROWS) {
        const score = getScoreForCell(postingHeatmap.scores, dayOfWeek, hour);
        map.set(`${date}:${hour}`, heatmapCellBackground(score));
      }
    }

    return map;
  }, [postingHeatmap, showPostingHeatmap, weekDates]);

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
    (date: string, hour: DropHour, event: React.DragEvent<HTMLDivElement>) => {
      clearDropTargetActive(event.currentTarget);
      const payload = captureDropPayload(event);

      if (!payload) {
        showToast("Could not read the dragged item. Try again.", "error");
        return;
      }

      const hourValue = typeof hour === "number" ? hour : undefined;
      onOptimisticReschedule(payload, date, hourValue);

      void executeRescheduleDrop({
        date,
        payload,
        ...(hourValue !== undefined ? { hour: hourValue, timezone } : {}),
        onRescheduled,
        onSuccess: (message) => showToast(message, "success"),
        onWarning: (message) => showToast(message, "warning"),
        onError: (message) => {
          onRescheduleFailed(payload);
          showToast(message, "error");
        },
      });
    },
    [
      onOptimisticReschedule,
      onRescheduleFailed,
      onRescheduled,
      showToast,
      timezone,
    ],
  );

  const bindDropTarget = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      handleDragOver(event);
      setDropTargetActive(event.currentTarget, true);
    },
    [handleDragOver],
  );

  const unbindDropTarget = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) {
        return;
      }
      setDropTargetActive(event.currentTarget, false);
    },
    [],
  );

  return (
    <>
      <p className="mb-3 text-[11px] font-extrabold tracking-[0.08em] text-cos-muted uppercase">
        {showPostingHeatmap ? "Heatmap week" : "Week grid"}
      </p>
      <div className="overflow-hidden rounded-[22px] border border-cos-border bg-cos-card shadow-[0_8px_28px_rgba(28,36,48,0.06)]">
        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-cos-border bg-[rgba(255,252,247,0.65)]">
          <div aria-hidden className="border-r border-cos-border" />
          {weekDates.map((date) => {
            const dateObj = parseLocalDate(date);
            return (
              <div key={date} className="border-r border-cos-border px-2 py-2.5 text-center last:border-r-0">
                <p className="text-[11px] font-extrabold tracking-[0.06em] text-cos-muted uppercase">
                  {formatLocalDate(date, { weekday: "short" })}
                </p>
                <p
                  className={cn(
                    "mx-auto mt-1 font-display text-lg font-semibold text-cos-text",
                    date === today &&
                      "inline-grid h-8 w-8 place-items-center rounded-full bg-[#2f4a3c] text-[15px] text-[#f6f2eb]",
                  )}
                >
                  {dateObj.getDate()}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <div className="border-r border-cos-border bg-[rgba(255,252,247,0.5)]">
            <div className="flex h-16 items-center justify-end border-b border-cos-border px-1.5">
              <span className="text-[10px] font-bold text-cos-muted">
                All day
              </span>
            </div>
            {HOUR_ROWS.map((hour) => (
              <div
                key={hour}
                className="flex h-11 items-start justify-end border-b border-cos-border px-1.5 pt-2"
              >
                <span className="text-[10px] font-bold text-cos-muted">
                  {formatHourLabel(hour)}
                </span>
              </div>
            ))}
          </div>

          {weekDates.map((date) => {
            const placement = placementByDate.get(date) ?? {
              allDay: [],
              byHour: new Map(),
            };
            const isTodayColumn = date === today;

            return (
              <div
                key={date}
                className={cn(
                  "border-r border-cos-border last:border-r-0",
                  isTodayColumn && !showPostingHeatmap && "bg-cos-accent-soft/20",
                )}
              >
                <div
                  data-testid={`calendar-drop-week-${date}-allday`}
                  onDragEnter={bindDropTarget}
                  onDragOver={bindDropTarget}
                  onDragLeave={unbindDropTarget}
                  onDrop={(event) => handleDrop(date, "allday", event)}
                  className="calendar-drop-target relative min-h-16 border-b border-cos-border p-1"
                >
                  {placement.allDay.length > 0 ? (
                    <div>
                      {preferSearchMatches(placement.allDay, highlightedItemIds)
                        .slice(0, 4)
                        .map((item) => (
                        <PlanningCalendarItemChip
                          key={item.id}
                          item={item}
                          compact
                          highlighted={Boolean(highlightedItemIds?.has(item.id))}
                          onSelect={onSelectItem}
                          onDragError={handleDragError}
                        />
                      ))}
                      {placement.allDay.length > 4 ? (
                        <p className="px-1 text-[11px] font-bold text-cos-muted">
                          +{placement.allDay.length - 4} more
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {HOUR_ROWS.map((hour) => {
                  const hourItems: EnrichedItem[] = placement.byHour.get(hour) ?? [];
                  const heatmapBackground = heatmapBackgroundByCell.get(
                    `${date}:${hour}`,
                  );

                  return (
                    <div
                      key={`${date}-${hour}`}
                      data-testid={`calendar-drop-week-${date}-${hour}`}
                      onDragEnter={bindDropTarget}
                      onDragOver={bindDropTarget}
                      onDragLeave={unbindDropTarget}
                      onDrop={(event) => handleDrop(date, hour, event)}
                      className="calendar-drop-target relative h-11 border-b border-cos-border"
                      style={
                        heatmapBackground
                          ? { backgroundColor: heatmapBackground }
                          : undefined
                      }
                    >
                      {hourItems.length > 0 && (
                        <div className="absolute inset-x-0 top-0 z-10 space-y-0.5 p-0.5">
                          {preferSearchMatches(hourItems, highlightedItemIds)
                            .slice(0, 2)
                            .map((item) => (
                            <PlanningCalendarItemChip
                              key={item.id}
                              item={item}
                              compact
                              elevatedOnHeatmap={showPostingHeatmap}
                              highlighted={Boolean(highlightedItemIds?.has(item.id))}
                              onSelect={onSelectItem}
                              onDragError={handleDragError}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
