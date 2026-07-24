export type DashboardWidgetId =
  | "up_next"
  | "attention"
  | "waiting_me"
  | "good_news"
  | "weather"
  | "calendar"
  | "this_week"
  | "approvals"
  | "tasks_week"
  | "volunteers"
  | "insights";

export type DashboardWidgetRegion = "main" | "rail";

export interface DashboardLayout {
  version: 1;
  main: DashboardWidgetId[];
  rail: DashboardWidgetId[];
}

export interface DashboardWidgetDefinition {
  id: DashboardWidgetId;
  label: string;
  description: string;
  region: DashboardWidgetRegion | "both";
  /** Phase when the widget is available in Add catalog. */
  phase: 1 | 2 | 3;
}

/** Default layout matching the approved Your overview mockup. */
export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  version: 1,
  main: ["up_next", "attention", "waiting_me", "good_news"],
  rail: ["weather", "calendar", "this_week"],
};

export const DASHBOARD_WIDGET_CATALOG: DashboardWidgetDefinition[] = [
  {
    id: "up_next",
    label: "Up Next",
    description: "Your next campaign action with artwork",
    region: "main",
    phase: 1,
  },
  {
    id: "attention",
    label: "Attention",
    description: "Approvals, volunteers, and tasks that need you",
    region: "main",
    phase: 1,
  },
  {
    id: "waiting_me",
    label: "Waiting on me",
    description: "Items assigned to you that still need action",
    region: "main",
    phase: 1,
  },
  {
    id: "good_news",
    label: "Good news",
    description: "Recent wins and progress",
    region: "main",
    phase: 1,
  },
  {
    id: "weather",
    label: "Weather",
    description: "Local weather for your school",
    region: "rail",
    phase: 1,
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Month view of school events",
    region: "rail",
    phase: 1,
  },
  {
    id: "this_week",
    label: "This week",
    description: "Events coming up this week",
    region: "rail",
    phase: 1,
  },
  {
    id: "approvals",
    label: "Approvals",
    description: "Approvals waiting on you",
    region: "main",
    phase: 3,
  },
  {
    id: "tasks_week",
    label: "Tasks this week",
    description: "Your tasks due this week",
    region: "main",
    phase: 3,
  },
  {
    id: "volunteers",
    label: "Volunteers",
    description: "Events that still need people",
    region: "main",
    phase: 3,
  },
  {
    id: "insights",
    label: "Insights",
    description: "Recent social performance",
    region: "main",
    phase: 3,
  },
];

const KNOWN_IDS = new Set<DashboardWidgetId>(
  DASHBOARD_WIDGET_CATALOG.map((entry) => entry.id),
);

export function isDashboardWidgetId(value: unknown): value is DashboardWidgetId {
  return typeof value === "string" && KNOWN_IDS.has(value as DashboardWidgetId);
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_DASHBOARD_LAYOUT };
  }

  const record = raw as Record<string, unknown>;
  const main = Array.isArray(record.main)
    ? record.main.filter(isDashboardWidgetId)
    : [];
  const rail = Array.isArray(record.rail)
    ? record.rail.filter(isDashboardWidgetId)
    : [];

  if (main.length === 0 && rail.length === 0) {
    return { ...DEFAULT_DASHBOARD_LAYOUT };
  }

  return {
    version: 1,
    main: main.length > 0 ? main : [...DEFAULT_DASHBOARD_LAYOUT.main],
    rail: rail.length > 0 ? rail : [...DEFAULT_DASHBOARD_LAYOUT.rail],
  };
}
