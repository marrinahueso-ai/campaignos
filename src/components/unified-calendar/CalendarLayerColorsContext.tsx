"use client";

import { createContext, useContext } from "react";
import {
  DEFAULT_CALENDAR_LAYER_COLORS,
} from "@/lib/communications-calendar/calendar-layout";
import {
  getDisplayStatus,
  getItemLayers,
  type CalendarLayerId,
} from "@/lib/communications-calendar/unified-calendar-layers";
import type { PlanningCalendarItem } from "@/types/communications-calendar";

export type CalendarLayerColorMap = Record<CalendarLayerId, string>;

const CalendarLayerColorsContext = createContext<CalendarLayerColorMap>(
  DEFAULT_CALENDAR_LAYER_COLORS,
);

export function CalendarLayerColorsProvider({
  colors,
  children,
}: {
  colors: CalendarLayerColorMap;
  children: React.ReactNode;
}) {
  return (
    <CalendarLayerColorsContext.Provider value={colors}>
      {children}
    </CalendarLayerColorsContext.Provider>
  );
}

export function useCalendarLayerColors(): CalendarLayerColorMap {
  return useContext(CalendarLayerColorsContext);
}

/** Resolve the Show-layer color for a calendar item, or null to keep overdue styling. */
export function resolveItemLayerColor(
  item: PlanningCalendarItem & { isOverdue?: boolean },
  colors: CalendarLayerColorMap,
): string | null {
  if (getDisplayStatus(item) === "overdue") {
    return null;
  }

  const layers = getItemLayers(item);
  if (layers.includes("events")) return colors.events;
  if (layers.includes("published")) return colors.published;
  if (layers.includes("scheduled")) return colors.scheduled;
  return null;
}
