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

function cloneDefaultLayout(): DashboardLayout {
  return {
    version: 1,
    main: [...DEFAULT_DASHBOARD_LAYOUT.main],
    rail: [...DEFAULT_DASHBOARD_LAYOUT.rail],
  };
}

function uniqueWidgetIds(ids: DashboardWidgetId[]): DashboardWidgetId[] {
  const seen = new Set<DashboardWidgetId>();
  const next: DashboardWidgetId[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function normalizeDashboardLayout(raw: unknown): DashboardLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return cloneDefaultLayout();
  }

  const record = raw as Record<string, unknown>;
  const hasMain = Array.isArray(record.main);
  const hasRail = Array.isArray(record.rail);

  // Empty prefs object means product default.
  if (!hasMain && !hasRail) {
    return cloneDefaultLayout();
  }

  const main = uniqueWidgetIds(
    hasMain
      ? (record.main as unknown[]).filter(isDashboardWidgetId)
      : [...DEFAULT_DASHBOARD_LAYOUT.main],
  );
  const mainSet = new Set(main);
  const rail = uniqueWidgetIds(
    (hasRail
      ? (record.rail as unknown[]).filter(isDashboardWidgetId)
      : [...DEFAULT_DASHBOARD_LAYOUT.rail]
    ).filter((id) => !mainSet.has(id)),
  );

  return { version: 1, main, rail };
}

/** Widgets available in the Add catalog for a given phase. */
export function getAddableDashboardWidgets(
  maxPhase: 1 | 2 | 3 = 2,
): DashboardWidgetDefinition[] {
  return DASHBOARD_WIDGET_CATALOG.filter((entry) => entry.phase <= maxPhase);
}

export function getDashboardWidgetDefinition(
  id: DashboardWidgetId,
): DashboardWidgetDefinition | undefined {
  return DASHBOARD_WIDGET_CATALOG.find((entry) => entry.id === id);
}

export function defaultRegionForWidget(
  id: DashboardWidgetId,
): DashboardWidgetRegion {
  const region = getDashboardWidgetDefinition(id)?.region ?? "main";
  return region === "both" ? "main" : region;
}

export function canPlaceDashboardWidgetInRegion(
  id: DashboardWidgetId,
  region: DashboardWidgetRegion,
): boolean {
  const allowed = getDashboardWidgetDefinition(id)?.region ?? "main";
  return allowed === "both" || allowed === region;
}

function arrayMoveIds(
  list: DashboardWidgetId[],
  fromIndex: number,
  toIndex: number,
): DashboardWidgetId[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex === toIndex ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item!);
  return next;
}

/** Reorder or move a widget across main/rail (Weather stays pinned atop rail). */
export function placeDashboardWidget(
  layout: DashboardLayout,
  activeId: DashboardWidgetId,
  overId: DashboardWidgetId,
): DashboardLayout {
  if (activeId === overId || activeId === "weather") {
    return layout;
  }

  const sourceRegion: DashboardWidgetRegion | null = layout.main.includes(
    activeId,
  )
    ? "main"
    : layout.rail.includes(activeId)
      ? "rail"
      : null;
  const targetRegion: DashboardWidgetRegion | null = layout.main.includes(overId)
    ? "main"
    : layout.rail.includes(overId)
      ? "rail"
      : null;

  if (!sourceRegion || !targetRegion) return layout;
  if (!canPlaceDashboardWidgetInRegion(activeId, targetRegion)) {
    return layout;
  }

  if (sourceRegion === targetRegion) {
    if (sourceRegion === "main") {
      return {
        version: 1,
        main: arrayMoveIds(
          layout.main,
          layout.main.indexOf(activeId),
          layout.main.indexOf(overId),
        ),
        rail: layout.rail,
      };
    }

    // Rail: Weather stays index 0; reorder only among the rest.
    if (overId === "weather") return layout;
    const hasWeather = layout.rail.includes("weather");
    const movable = layout.rail.filter((id) => id !== "weather");
    const moved = arrayMoveIds(
      movable,
      movable.indexOf(activeId),
      movable.indexOf(overId),
    );
    return {
      version: 1,
      main: layout.main,
      rail: hasWeather ? ["weather", ...moved] : moved,
    };
  }

  // Cross-region move.
  const nextMain = layout.main.filter((id) => id !== activeId);
  const nextRail = layout.rail.filter((id) => id !== activeId);

  if (targetRegion === "main") {
    const insertAt = nextMain.indexOf(overId);
    nextMain.splice(insertAt < 0 ? nextMain.length : insertAt, 0, activeId);
    return {
      version: 1,
      main: nextMain,
      rail: nextRail.includes("weather")
        ? ["weather", ...nextRail.filter((id) => id !== "weather")]
        : nextRail,
    };
  }

  const hasWeather = layout.rail.includes("weather") || overId === "weather";
  const movable = nextRail.filter((id) => id !== "weather");
  if (overId === "weather") {
    movable.unshift(activeId);
  } else {
    const insertAt = movable.indexOf(overId);
    movable.splice(insertAt < 0 ? movable.length : insertAt, 0, activeId);
  }
  return {
    version: 1,
    main: nextMain,
    rail: hasWeather ? ["weather", ...movable] : movable,
  };
}

export function layoutContainsWidget(
  layout: DashboardLayout,
  id: DashboardWidgetId,
): boolean {
  return layout.main.includes(id) || layout.rail.includes(id);
}

/** Apply Add-modal checkbox selection while preserving existing order. */
export function applyDashboardWidgetSelection(
  current: DashboardLayout,
  selectedIds: readonly DashboardWidgetId[],
  maxPhase: 1 | 2 | 3 = 2,
): DashboardLayout {
  const allowed = new Set(
    getAddableDashboardWidgets(maxPhase).map((entry) => entry.id),
  );
  const selected = new Set(
    selectedIds.filter((id) => allowed.has(id)),
  );

  const main = current.main.filter((id) => selected.has(id));
  const rail = current.rail.filter((id) => selected.has(id));
  const placed = new Set<DashboardWidgetId>([...main, ...rail]);

  for (const id of selected) {
    if (placed.has(id)) continue;
    const region = defaultRegionForWidget(id);
    if (region === "rail") {
      rail.push(id);
    } else {
      main.push(id);
    }
    placed.add(id);
  }

  return normalizeDashboardLayout({ version: 1, main, rail });
}

export function removeDashboardWidget(
  layout: DashboardLayout,
  id: DashboardWidgetId,
): DashboardLayout {
  return normalizeDashboardLayout({
    version: 1,
    main: layout.main.filter((entry) => entry !== id),
    rail: layout.rail.filter((entry) => entry !== id),
  });
}

export function moveDashboardWidget(
  layout: DashboardLayout,
  region: DashboardWidgetRegion,
  id: DashboardWidgetId,
  direction: -1 | 1,
): DashboardLayout {
  const list = [...layout[region]];
  const index = list.indexOf(id);
  if (index < 0) return layout;
  const target = index + direction;
  if (target < 0 || target >= list.length) return layout;
  const [item] = list.splice(index, 1);
  list.splice(target, 0, item);
  return {
    version: 1,
    main: region === "main" ? list : layout.main,
    rail: region === "rail" ? list : layout.rail,
  };
}
