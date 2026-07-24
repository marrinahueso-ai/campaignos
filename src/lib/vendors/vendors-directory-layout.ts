import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";

export type VendorsDirectorySummaryKey =
  | "total_vendors"
  | "confirmed"
  | "upcoming_events"
  | "favorite_vendors";

export const VENDORS_DIRECTORY_SUMMARY_CARDS: {
  key: VendorsDirectorySummaryKey;
  label: string;
}[] = [
  { key: "total_vendors", label: "Total Vendors" },
  { key: "confirmed", label: "Confirmed" },
  { key: "upcoming_events", label: "Upcoming Events" },
  { key: "favorite_vendors", label: "Favorite Vendors" },
];

export type VendorsDirectorySummaryColors = Partial<
  Record<VendorsDirectorySummaryKey, string>
>;

export interface VendorsDirectoryLayout {
  version: 1;
  order: VendorsDirectorySummaryKey[];
  colors?: VendorsDirectorySummaryColors;
}

const KNOWN_KEYS = new Set<VendorsDirectorySummaryKey>(
  VENDORS_DIRECTORY_SUMMARY_CARDS.map((card) => card.key),
);

export function defaultVendorsDirectoryLayout(): VendorsDirectoryLayout {
  return {
    version: 1,
    order: VENDORS_DIRECTORY_SUMMARY_CARDS.map((card) => card.key),
  };
}

function isSummaryKey(value: unknown): value is VendorsDirectorySummaryKey {
  return (
    typeof value === "string" &&
    KNOWN_KEYS.has(value as VendorsDirectorySummaryKey)
  );
}

export function normalizeVendorsDirectoryLayout(
  raw: unknown,
): VendorsDirectoryLayout {
  const fallback = defaultVendorsDirectoryLayout();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isSummaryKey)
    : [];

  const seen = new Set<VendorsDirectorySummaryKey>();
  const order: VendorsDirectorySummaryKey[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: VendorsDirectorySummaryColors = {};
  if (
    record.colors &&
    typeof record.colors === "object" &&
    !Array.isArray(record.colors)
  ) {
    for (const [key, value] of Object.entries(
      record.colors as Record<string, unknown>,
    )) {
      if (!isSummaryKey(key)) continue;
      const hex = normalizeDashboardCardColor(value);
      if (!hex) continue;
      colors[key] = hex;
    }
  }

  const next: VendorsDirectoryLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderVendorsDirectorySummary(
  layout: VendorsDirectoryLayout,
  activeKey: VendorsDirectorySummaryKey,
  overKey: VendorsDirectorySummaryKey,
): VendorsDirectoryLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setVendorsDirectorySummaryColor(
  layout: VendorsDirectoryLayout,
  key: VendorsDirectorySummaryKey,
  color: string | null,
): VendorsDirectoryLayout {
  const colors: VendorsDirectorySummaryColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: VendorsDirectoryLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
