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
