import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";
import type { InsightsKpiKey } from "./types.ts";

export const INSIGHTS_KPI_ORDER: InsightsKpiKey[] = [
  "views",
  "reach",
  "engagement",
  "likes",
  "comments",
];

export type InsightsKpiColors = Partial<Record<InsightsKpiKey, string>>;

export interface InsightsLayout {
  version: 1;
  order: InsightsKpiKey[];
  colors?: InsightsKpiColors;
}

const KNOWN_KEYS = new Set<InsightsKpiKey>(INSIGHTS_KPI_ORDER);

export function defaultInsightsLayout(): InsightsLayout {
  return {
    version: 1,
    order: [...INSIGHTS_KPI_ORDER],
  };
}

function isKpiKey(value: unknown): value is InsightsKpiKey {
  return typeof value === "string" && KNOWN_KEYS.has(value as InsightsKpiKey);
}

export function normalizeInsightsLayout(raw: unknown): InsightsLayout {
  const fallback = defaultInsightsLayout();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isKpiKey)
    : [];

  const seen = new Set<InsightsKpiKey>();
  const order: InsightsKpiKey[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: InsightsKpiColors = {};
  if (
    record.colors &&
    typeof record.colors === "object" &&
    !Array.isArray(record.colors)
  ) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isKpiKey(key)) continue;
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: InsightsLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderInsightsKpi(
  layout: InsightsLayout,
  activeKey: InsightsKpiKey,
  overKey: InsightsKpiKey,
): InsightsLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setInsightsKpiColor(
  layout: InsightsLayout,
  key: InsightsKpiKey,
  color: string | null,
): InsightsLayout {
  const colors: InsightsKpiColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: InsightsLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
