import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";
import type { CalendarLayerId } from "./unified-calendar-layers.ts";

/** Product defaults matching `--cos-primary` / `--cos-accent` / `--cos-success`. */
export const DEFAULT_CALENDAR_LAYER_COLORS: Record<CalendarLayerId, string> = {
  events: "#2a2622",
  scheduled: "#b8956f",
  published: "#5f735f",
};

export type CalendarLayerColors = Partial<Record<CalendarLayerId, string>>;

export interface CalendarLayout {
  version: 1;
  colors?: CalendarLayerColors;
}

const LAYER_IDS: CalendarLayerId[] = ["events", "scheduled", "published"];

export function defaultCalendarLayout(): CalendarLayout {
  return { version: 1 };
}

function isLayerId(value: string): value is CalendarLayerId {
  return (LAYER_IDS as string[]).includes(value);
}

export function normalizeCalendarLayout(raw: unknown): CalendarLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultCalendarLayout();
  }

  const record = raw as Record<string, unknown>;
  const colors: CalendarLayerColors = {};
  if (
    record.colors &&
    typeof record.colors === "object" &&
    !Array.isArray(record.colors)
  ) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isLayerId(key)) continue;
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: CalendarLayout = { version: 1 };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function resolveCalendarLayerColor(
  layout: CalendarLayout,
  layerId: CalendarLayerId,
): string {
  return layout.colors?.[layerId] ?? DEFAULT_CALENDAR_LAYER_COLORS[layerId];
}

export function resolveCalendarLayerColors(
  layout: CalendarLayout,
): Record<CalendarLayerId, string> {
  return {
    events: resolveCalendarLayerColor(layout, "events"),
    scheduled: resolveCalendarLayerColor(layout, "scheduled"),
    published: resolveCalendarLayerColor(layout, "published"),
  };
}

export function setCalendarLayerColor(
  layout: CalendarLayout,
  layerId: CalendarLayerId,
  color: string | null,
): CalendarLayout {
  const colors: CalendarLayerColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex && hex !== DEFAULT_CALENDAR_LAYER_COLORS[layerId]) {
    colors[layerId] = hex;
  } else {
    delete colors[layerId];
  }
  const next: CalendarLayout = { version: 1 };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
