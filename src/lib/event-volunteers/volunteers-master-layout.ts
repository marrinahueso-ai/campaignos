import { normalizeDashboardCardColor } from "../today/dashboard-widget-colors.ts";

export type VolunteersMasterKpiKey =
  | "total_volunteers"
  | "fill_rate"
  | "underfilled"
  | "upcoming";

export const VOLUNTEERS_MASTER_KPI_CARDS: {
  key: VolunteersMasterKpiKey;
  label: string;
}[] = [
  { key: "total_volunteers", label: "Total Volunteers" },
  { key: "fill_rate", label: "Overall Fill Rate" },
  { key: "underfilled", label: "Underfilled Roles" },
  { key: "upcoming", label: "Upcoming Events" },
];

export type VolunteersMasterKpiColors = Partial<
  Record<VolunteersMasterKpiKey, string>
>;

export interface VolunteersMasterLayout {
  version: 1;
  order: VolunteersMasterKpiKey[];
  colors?: VolunteersMasterKpiColors;
}

const KNOWN_KEYS = new Set<VolunteersMasterKpiKey>(
  VOLUNTEERS_MASTER_KPI_CARDS.map((card) => card.key),
);

export function defaultVolunteersMasterLayout(): VolunteersMasterLayout {
  return {
    version: 1,
    order: VOLUNTEERS_MASTER_KPI_CARDS.map((card) => card.key),
  };
}

function isKpiKey(value: unknown): value is VolunteersMasterKpiKey {
  return typeof value === "string" && KNOWN_KEYS.has(value as VolunteersMasterKpiKey);
}

export function normalizeVolunteersMasterLayout(
  raw: unknown,
): VolunteersMasterLayout {
  const fallback = defaultVolunteersMasterLayout();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fallback;
  }

  const record = raw as Record<string, unknown>;
  const fromOrder = Array.isArray(record.order)
    ? (record.order as unknown[]).filter(isKpiKey)
    : [];

  const seen = new Set<VolunteersMasterKpiKey>();
  const order: VolunteersMasterKpiKey[] = [];
  for (const key of fromOrder) {
    if (seen.has(key)) continue;
    seen.add(key);
    order.push(key);
  }
  for (const key of fallback.order) {
    if (seen.has(key)) continue;
    order.push(key);
  }

  const colors: VolunteersMasterKpiColors = {};
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

  const next: VolunteersMasterLayout = { version: 1, order };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}

export function reorderVolunteersMasterKpi(
  layout: VolunteersMasterLayout,
  activeKey: VolunteersMasterKpiKey,
  overKey: VolunteersMasterKpiKey,
): VolunteersMasterLayout {
  if (activeKey === overKey) return layout;
  const order = [...layout.order];
  const from = order.indexOf(activeKey);
  const to = order.indexOf(overKey);
  if (from < 0 || to < 0) return layout;
  const [item] = order.splice(from, 1);
  order.splice(to, 0, item!);
  return { ...layout, order };
}

export function setVolunteersMasterKpiColor(
  layout: VolunteersMasterLayout,
  key: VolunteersMasterKpiKey,
  color: string | null,
): VolunteersMasterLayout {
  const colors: VolunteersMasterKpiColors = { ...(layout.colors ?? {}) };
  const hex = color ? normalizeDashboardCardColor(color) : null;
  if (hex) {
    colors[key] = hex;
  } else {
    delete colors[key];
  }
  const next: VolunteersMasterLayout = {
    version: 1,
    order: layout.order,
  };
  if (Object.keys(colors).length > 0) {
    next.colors = colors;
  }
  return next;
}
