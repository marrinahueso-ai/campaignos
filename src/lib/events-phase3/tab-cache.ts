/**
 * In-session Event Detail tab cache keys — always include eventId so switching
 * events never reuses prior-event tab payloads.
 */
export function eventTabCacheKey(eventId: string, tab: string): string {
  return `${eventId}::${tab}`;
}

export function parseEventTabCacheKey(
  key: string,
): { eventId: string; tab: string } | null {
  const separator = key.indexOf("::");
  if (separator <= 0) {
    return null;
  }
  return {
    eventId: key.slice(0, separator),
    tab: key.slice(separator + 2),
  };
}

export function shouldReuseEventTabCache(
  cacheEventId: string | null | undefined,
  nextEventId: string,
): boolean {
  return Boolean(cacheEventId && cacheEventId === nextEventId);
}

/** Remove one eventId::tab entry; leave all other keys untouched. */
export function invalidateEventTabCacheEntry(
  cache: Map<string, unknown>,
  eventId: string,
  tab: string,
): boolean {
  return cache.delete(eventTabCacheKey(eventId, tab));
}

/** Keys that remain after invalidating one tab (for regression tests). */
export function listEventTabCacheKeys(cache: Map<string, unknown>): string[] {
  return [...cache.keys()].sort();
}

export function eventTabCacheHas(
  cache: Map<string, unknown>,
  eventId: string,
  tab: string,
): boolean {
  return cache.has(eventTabCacheKey(eventId, tab));
}

export type HeroStatsRefreshTab = "approvals" | "tasks" | "volunteers";

export function tabAffectsHeroStats(tab: string): tab is HeroStatsRefreshTab {
  return tab === "approvals" || tab === "tasks" || tab === "volunteers";
}
