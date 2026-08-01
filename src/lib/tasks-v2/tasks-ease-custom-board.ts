/**
 * Custom board setup for the Tasks Ease shell — column names + a task→column
 * map. Per-person, per-browser (v1): boards don't invent new tasks, they
 * just rearrange the same event-linked tasks into buckets that match how a
 * PTO actually works.
 *
 * Keys are org (+ user) scoped via setTasksEaseStorageScope.
 */
import { tasksEaseStorageKey } from "@/lib/tasks-v2/tasks-ease-storage-scope";

const CUSTOM_BOARD_BASE = "heyralli:tasks-ease:custom-board:v1";

export interface TasksEaseCustomColumn {
  id: string;
  name: string;
}

export interface TasksEaseCustomBoardState {
  columns: TasksEaseCustomColumn[];
  /** taskId -> columnId. Unmapped tasks fall into the first column. */
  taskColumnMap: Record<string, string>;
}

export const TASKS_EASE_CUSTOM_BOARD_DEFAULT_COLUMNS: TasksEaseCustomColumn[] = [
  { id: "waiting-on-school", name: "Waiting on school" },
  { id: "needs-volunteer", name: "Needs volunteer" },
  { id: "ready-to-post", name: "Ready to post" },
  { id: "done-for-now", name: "Done for now" },
];

function defaultState(): TasksEaseCustomBoardState {
  return {
    columns: TASKS_EASE_CUSTOM_BOARD_DEFAULT_COLUMNS.map((column) => ({ ...column })),
    taskColumnMap: {},
  };
}

function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function isValidColumn(value: unknown): value is TasksEaseCustomColumn {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as TasksEaseCustomColumn).id === "string" &&
    typeof (value as TasksEaseCustomColumn).name === "string"
  );
}

export function loadTasksEaseCustomBoard(): TasksEaseCustomBoardState {
  if (!hasStorage()) return defaultState();
  const key = tasksEaseStorageKey(CUSTOM_BOARD_BASE);
  if (!key) return defaultState();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<TasksEaseCustomBoardState>;
    const columns = Array.isArray(parsed.columns)
      ? parsed.columns.filter(isValidColumn)
      : [];
    const taskColumnMap =
      parsed.taskColumnMap && typeof parsed.taskColumnMap === "object"
        ? Object.fromEntries(
            Object.entries(parsed.taskColumnMap).filter(
              ([, value]) => typeof value === "string",
            ),
          )
        : {};
    return {
      columns: columns.length > 0 ? columns : defaultState().columns,
      taskColumnMap,
    };
  } catch {
    return defaultState();
  }
}

export function saveTasksEaseCustomBoard(state: TasksEaseCustomBoardState): void {
  if (!hasStorage()) return;
  const key = tasksEaseStorageKey(CUSTOM_BOARD_BASE);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Best-effort only.
  }
}

/** First column tasks fall into when they have no explicit mapping yet. */
export function resolveCustomColumnId(
  taskId: string,
  state: TasksEaseCustomBoardState,
): string {
  const mapped = state.taskColumnMap[taskId];
  if (mapped && state.columns.some((column) => column.id === mapped)) {
    return mapped;
  }
  return state.columns[0]?.id ?? "";
}
