/**
 * Per-browser priority overrides for Tasks List (no DB column yet).
 * Falls back to derived priority from due date / status when unset.
 */
import type { TasksV2Priority } from "@/types/tasks-v2";

const PRIORITIES_KEY = "heyralli:tasks-ease:task-priorities:v1";

let cache: Record<string, TasksV2Priority> | null = null;

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
  try {
    const raw = window.localStorage.getItem(PRIORITIES_KEY);
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
  try {
    window.localStorage.setItem(PRIORITIES_KEY, JSON.stringify(map));
  } catch {
    // Best-effort
  }
}

function ensureCache(): Record<string, TasksV2Priority> {
  if (!cache) cache = readMap();
  return cache;
}

export function loadTasksEasePriorities(): Record<string, TasksV2Priority> {
  return { ...ensureCache() };
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
