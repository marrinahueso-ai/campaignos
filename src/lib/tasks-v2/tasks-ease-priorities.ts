/**
 * Per-browser priority overrides for Tasks List (no DB column yet).
 * Falls back to derived priority from due date / status when unset.
 * Keys are org (+ user) scoped via setTasksEaseStorageScope.
 */
import type { TasksV2Priority } from "@/types/tasks-v2";
import { tasksEaseStorageKey } from "@/lib/tasks-v2/tasks-ease-storage-scope";

const PRIORITIES_BASE = "heyralli:tasks-ease:task-priorities:v1";

let cache: Record<string, TasksV2Priority> | null = null;
let cacheScopeKey: string | null = null;

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function isPriority(value: unknown): value is TasksV2Priority {
  return value === "high" || value === "medium" || value === "low";
}

function readMap(): Record<string, TasksV2Priority> {
  if (!hasStorage()) return {};
  const key = tasksEaseStorageKey(PRIORITIES_BASE);
  if (!key) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, TasksV2Priority> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (isPriority(value)) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, TasksV2Priority>): void {
  if (!hasStorage()) return;
  const key = tasksEaseStorageKey(PRIORITIES_BASE);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Best-effort
  }
}

function ensureCache(): Record<string, TasksV2Priority> {
  const scopeKey = tasksEaseStorageKey(PRIORITIES_BASE);
  if (!cache || cacheScopeKey !== scopeKey) {
    cache = readMap();
    cacheScopeKey = scopeKey;
  }
  return cache;
}

export function loadTasksEasePriorities(): Record<string, TasksV2Priority> {
  cache = readMap();
  cacheScopeKey = tasksEaseStorageKey(PRIORITIES_BASE);
  return { ...cache };
}

export function saveTaskPriority(
  taskId: string,
  priority: TasksV2Priority | null,
): void {
  const map = ensureCache();
  if (!priority) {
    delete map[taskId];
  } else {
    map[taskId] = priority;
  }
  writeMap(map);
}

export function getTaskPriorityOverride(
  taskId: string,
): TasksV2Priority | null {
  return ensureCache()[taskId] ?? null;
}
