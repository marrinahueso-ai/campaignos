/**
 * Per-browser color overrides for the Tasks Ease shell (event stripes +
 * board column headers). Mirrors the calendar Show-chip color picker
 * pattern, but scoped to Tasks and stored client-side only (v1 — no
 * server persistence needed for a personal color preference).
 *
 * Keys are org (+ user) scoped via setTasksEaseStorageScope.
 */
import { normalizeDashboardCardColor } from "@/lib/today/dashboard-widget-colors";
import { tasksEaseStorageKey } from "@/lib/tasks-v2/tasks-ease-storage-scope";

const EVENT_COLORS_BASE = "heyralli:tasks-ease:event-colors:v1";
const COLUMN_COLORS_BASE = "heyralli:tasks-ease:column-colors:v1";

export interface TasksEaseColorMaps {
  events: Record<string, string>;
  columns: Record<string, string>;
}

let cache: TasksEaseColorMaps | null = null;
let cacheScopeKey: string | null = null;

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function readColorMap(baseKey: string): Record<string, string> {
  if (!hasStorage()) return {};
  const key = tasksEaseStorageKey(baseKey);
  if (!key) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [id, value] of Object.entries(parsed)) {
      const normalized = normalizeDashboardCardColor(value);
      if (normalized) out[id] = normalized;
    }
    return out;
  } catch {
    return {};
  }
}

function writeColorMap(baseKey: string, map: Record<string, string>): void {
  if (!hasStorage()) return;
  const key = tasksEaseStorageKey(baseKey);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Best-effort only — color prefs are a nice-to-have, not required.
  }
}

function ensureCache(): TasksEaseColorMaps {
  const scopeKey = tasksEaseStorageKey(EVENT_COLORS_BASE);
  if (!cache || cacheScopeKey !== scopeKey) {
    cache = {
      events: readColorMap(EVENT_COLORS_BASE),
      columns: readColorMap(COLUMN_COLORS_BASE),
    };
    cacheScopeKey = scopeKey;
  }
  return cache;
}

/** Re-read localStorage (call once on client mount to hydrate after SSR). */
export function loadTasksEaseColors(): TasksEaseColorMaps {
  cache = {
    events: readColorMap(EVENT_COLORS_BASE),
    columns: readColorMap(COLUMN_COLORS_BASE),
  };
  cacheScopeKey = tasksEaseStorageKey(EVENT_COLORS_BASE);
  return cache;
}

export function saveEventColor(
  eventId: string,
  color: string | null,
): TasksEaseColorMaps {
  const current = ensureCache();
  const next = { ...current.events };
  const normalized = normalizeDashboardCardColor(color);
  if (normalized) {
    next[eventId] = normalized;
  } else {
    delete next[eventId];
  }
  cache = { ...current, events: next };
  writeColorMap(EVENT_COLORS_BASE, next);
  return cache;
}

export function saveColumnColor(
  columnKey: string,
  color: string | null,
): TasksEaseColorMaps {
  const current = ensureCache();
  const next = { ...current.columns };
  const normalized = normalizeDashboardCardColor(color);
  if (normalized) {
    next[columnKey] = normalized;
  } else {
    delete next[columnKey];
  }
  cache = { ...current, columns: next };
  writeColorMap(COLUMN_COLORS_BASE, next);
  return cache;
}

/** Event stripe color: stored override, else the caller-supplied default. */
export function resolveEventColor(eventId: string, fallback: string): string {
  const current = ensureCache();
  return current.events[eventId] ?? normalizeDashboardCardColor(fallback) ?? fallback;
}

/** Board column color: stored override, else the caller-supplied default. */
export function resolveColumnColor(columnKey: string, fallback: string): string {
  const current = ensureCache();
  return current.columns[columnKey] ?? normalizeDashboardCardColor(fallback) ?? fallback;
}

/** Raw stored override (no fallback) — lets pickers show "no custom color yet". */
export function getEventColorOverride(eventId: string): string | null {
  return ensureCache().events[eventId] ?? null;
}

/** Raw stored override (no fallback) — lets pickers show "no custom color yet". */
export function getColumnColorOverride(columnKey: string): string | null {
  return ensureCache().columns[columnKey] ?? null;
}
