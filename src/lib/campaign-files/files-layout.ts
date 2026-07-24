import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";

/** Special carousel card for the unscoped “All events” filter. */
export const FILES_ALL_EVENTS_KEY = "all";

export type FilesEventCardColors = Record<string, string>;

export interface FilesLayout {
  version: 1;
  /** Card keys: `"all"` plus event ids. */
  order: string[];
  colors?: FilesEventCardColors;
}

export function defaultFilesLayout(eventIds: string[] = []): FilesLayout {
  return {
    version: 1,
    order: [FILES_ALL_EVENTS_KEY, ...eventIds],
  };
}

function isCardKey(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Normalize a stored layout. When `eventIds` is provided, drop unknown events
 * and append any missing ones after `"all"`.
 */
export function normalizeFilesLayout(
  raw: unknown,
  eventIds?: string[],
): FilesLayout {
  const knownEvents = eventIds ? new Set(eventIds) : null;
  const fallback = defaultFilesLayout(eventIds ?? []);

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isCardKey)
    : [];

  const seen = new Set<string>();
  const order: string[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    if (key !== FILES_ALL_EVENTS_KEY && knownEvents && !knownEvents.has(key)) {
      continue;
    }
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: FilesEventCardColors = {};
  if (
    record.colors &&
    typeof record.colors === "object" &&
    !Array.isArray(record.colors)
  ) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isCardKey(key)) continue;
      if (key !== FILES_ALL_EVENTS_KEY && knownEvents && !knownEvents.has(key)) {
        continue;
      }
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: FilesLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderFilesEventCard(
  layout: FilesLayout,
  activeKey: string,
  overKey: string,
): FilesLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setFilesEventCardColor(
  layout: FilesLayout,
  key: string,
  color: string | null,
): FilesLayout {
  const colors: FilesEventCardColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: FilesLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
