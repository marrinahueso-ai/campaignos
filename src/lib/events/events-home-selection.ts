import type { Event } from "@/types";

/** Default visible Also Ahead rows before expand (matches Pilot ~3–4). */
export const EVENTS_ALSO_AHEAD_COLLAPSED_COUNT = 4;

/**
 * Resolve the selected event from an accessible list + optional URL id.
 * Untrusted URL ids only win when present in `accessibleEvents`.
 */
export function resolveSelectedEventsHomeEvent(input: {
  accessibleEvents: Event[];
  requestedEventId?: string | null;
  /** Prefer this when no valid URL id (e.g. previous selection still in list). */
  preferredEventId?: string | null;
}): Event | null {
  const { accessibleEvents, requestedEventId, preferredEventId } = input;
  if (accessibleEvents.length === 0) {
    return null;
  }

  const requested = requestedEventId?.trim() || null;
  if (requested) {
    const match = accessibleEvents.find((event) => event.id === requested);
    if (match) return match;
  }

  const preferred = preferredEventId?.trim() || null;
  if (preferred) {
    const match = accessibleEvents.find((event) => event.id === preferred);
    if (match) return match;
  }

  return accessibleEvents[0] ?? null;
}

export function eventsHomeAlsoAheadEvents(
  lensEvents: Event[],
  selectedEventId: string | null,
): Event[] {
  if (!selectedEventId) return lensEvents;
  return lensEvents.filter((event) => event.id !== selectedEventId);
}

export function sliceAlsoAheadEvents(
  events: Event[],
  expanded: boolean,
  collapsedCount = EVENTS_ALSO_AHEAD_COLLAPSED_COUNT,
): Event[] {
  if (expanded || events.length <= collapsedCount) {
    return events;
  }
  return events.slice(0, collapsedCount);
}
