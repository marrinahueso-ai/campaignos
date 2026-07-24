import {
  EVENTS_HOME_SUMMARY_CARDS,
  type EventsHomeSummaryKey,
} from "./events-home-summary.ts";
import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";

export type EventsHomeCardColors = Partial<
  Record<EventsHomeSummaryKey, string>
>;

export interface EventsHomeLayout {
  version: 1;
  order: EventsHomeSummaryKey[];
  colors?: EventsHomeCardColors;
}

const KNOWN_KEYS = new Set<EventsHomeSummaryKey>(
  EVENTS_HOME_SUMMARY_CARDS.map((card) => card.key),
);

export function defaultEventsHomeLayout(): EventsHomeLayout {
  return {
    version: 1,
    order: EVENTS_HOME_SUMMARY_CARDS.map((card) => card.key),
  };
}

function isSummaryKey(value: unknown): value is EventsHomeSummaryKey {
  return typeof value === "string" && KNOWN_KEYS.has(value as EventsHomeSummaryKey);
}

export function normalizeEventsHomeLayout(raw: unknown): EventsHomeLayout {
  const fallback = defaultEventsHomeLayout();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isSummaryKey)
    : [];

  const seen = new Set<EventsHomeSummaryKey>();
  const order: EventsHomeSummaryKey[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: EventsHomeCardColors = {};
  if (record.colors && typeof record.colors === "object" && !Array.isArray(record.colors)) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isSummaryKey(key)) continue;
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: EventsHomeLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderEventsHomeCard(
  layout: EventsHomeLayout,
  activeKey: EventsHomeSummaryKey,
  overKey: EventsHomeSummaryKey,
): EventsHomeLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setEventsHomeCardColor(
  layout: EventsHomeLayout,
  key: EventsHomeSummaryKey,
  color: string | null,
): EventsHomeLayout {
  const colors: EventsHomeCardColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: EventsHomeLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
