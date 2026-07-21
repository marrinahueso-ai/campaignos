import { resolveEventFromQuestion } from "./event-resolver.ts";
import { extractEventIdFromPathname, isOpsIntent } from "./ops-intent.ts";
import { shouldPreferOrgBriefing } from "./org-intent.ts";

export type ResolvableEventLite = {
  id: string;
  title: string;
  date: string;
  status: string;
};

/**
 * Whether this question names a specific event (token match only).
 * Pathname is ignored so org briefings still work on an event page.
 */
export function questionNamesSpecificEvent(
  question: string,
  events: ResolvableEventLite[],
): boolean {
  if (events.length === 0) return false;
  const resolution = resolveEventFromQuestion(question, events, null);
  return resolution.kind === "matched";
}

/**
 * Org / role briefing path — even without an event name.
 * Event-scoped phrasing (named event) stays on Phase 1 ops.
 */
export function shouldRouteToOrgBriefing(
  question: string,
  events?: ResolvableEventLite[],
): boolean {
  if (!shouldPreferOrgBriefing(question)) {
    return false;
  }
  if (events && questionNamesSpecificEvent(question, events)) {
    return false;
  }
  return true;
}

/**
 * Whether this question should take the event ops coach path.
 * Pure checks first; optional event-name probe when events are provided.
 */
export function shouldRouteToOpsAsk(
  question: string,
  pathname?: string | null,
  events?: ResolvableEventLite[],
): boolean {
  if (shouldRouteToOrgBriefing(question, events)) {
    return false;
  }
  if (isOpsIntent(question)) {
    return true;
  }
  if (extractEventIdFromPathname(pathname)) {
    return true;
  }
  if (events && events.length > 0) {
    const resolution = resolveEventFromQuestion(question, events, pathname);
    return resolution.kind === "matched" || resolution.kind === "ambiguous";
  }
  return false;
}
