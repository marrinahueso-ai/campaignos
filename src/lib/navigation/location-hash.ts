type LocationHashListener = () => void;

const listeners = new Set<LocationHashListener>();
let historyPatched = false;
let originalPushState: History["pushState"] | null = null;
let originalReplaceState: History["replaceState"] | null = null;

function notifyLocationHashListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function ensureHistoryPatched() {
  if (historyPatched || typeof window === "undefined") {
    return;
  }

  originalPushState = window.history.pushState.bind(window.history);
  originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = function pushStateWithHashNotify(...args) {
    originalPushState?.(...args);
    queueMicrotask(notifyLocationHashListeners);
  };

  window.history.replaceState = function replaceStateWithHashNotify(...args) {
    originalReplaceState?.(...args);
    queueMicrotask(notifyLocationHashListeners);
  };

  historyPatched = true;
}

function restoreHistoryPatchIfIdle() {
  if (!historyPatched || listeners.size > 0 || typeof window === "undefined") {
    return;
  }

  if (originalPushState) {
    window.history.pushState = originalPushState;
  }
  if (originalReplaceState) {
    window.history.replaceState = originalReplaceState;
  }

  historyPatched = false;
  originalPushState = null;
  originalReplaceState = null;
}

export function normalizeLocationHash(hash: string): string {
  return hash.replace(/^#/, "");
}

export function getLocationHash(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hash;
}

/** Set the URL hash and notify hash listeners (including History API updates). */
export function setLocationHash(hash: string): void {
  const normalized = normalizeLocationHash(hash);
  const current = normalizeLocationHash(window.location.hash);

  if (current === normalized) {
    notifyLocationHashListeners();
    return;
  }

  window.location.hash = normalized;
}

/**
 * Subscribe to hash updates from both hash assignment and History API navigation.
 * Next.js App Router tab changes use pushState/replaceState, which skip hashchange.
 */
export function subscribeToLocationHash(onChange: () => void): () => void {
  ensureHistoryPatched();
  listeners.add(onChange);
  window.addEventListener("hashchange", onChange);

  return () => {
    listeners.delete(onChange);
    window.removeEventListener("hashchange", onChange);
    restoreHistoryPatchIfIdle();
  };
}
