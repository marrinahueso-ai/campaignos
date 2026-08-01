/**
 * Per-org (+ optional user) scope for Tasks Ease localStorage keys.
 * Prevents one org's event-color / priority / board prefs from bleeding into
 * another org on a shared browser, and makes sign-out cleanup straightforward.
 */

export const TASKS_EASE_STORAGE_PREFIX = "heyralli:tasks-ease:";

let storageScope: string | null = null;

export function setTasksEaseStorageScope(input: {
  organizationId: string | null | undefined;
  userId?: string | null | undefined;
}): void {
  const orgId = input.organizationId?.trim() || null;
  const userId = input.userId?.trim() || null;
  const next = orgId ? (userId ? `${orgId}:${userId}` : orgId) : null;
  if (next !== storageScope) {
    storageScope = next;
  }
}

export function getTasksEaseStorageScope(): string | null {
  return storageScope;
}

/** Build a scoped key; returns null when no scope is set (do not read/write). */
export function tasksEaseStorageKey(baseKey: string): string | null {
  if (!storageScope) return null;
  return `${baseKey}:${storageScope}`;
}

/** Clears every Tasks Ease preference key from this browser (sign-out). */
export function clearTasksEaseLocalStorageOnSignOut(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const { localStorage } = window;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(TASKS_EASE_STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
    storageScope = null;
  } catch {
    // Sign-out must never fail because of localStorage.
  }
}
