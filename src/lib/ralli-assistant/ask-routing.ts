import { shouldPreferCommsOps } from "./comms-intent.ts";
import { shouldPreferContentAsk } from "./content-intent.ts";
import { resolveEventFromQuestion } from "./event-resolver.ts";
import {
  extractEventIdFromPathname,
  isHowToNavigationQuestion,
  isOpsIntent,
} from "./ops-intent.ts";
import { shouldPreferOrgBriefing } from "./org-intent.ts";
import { shouldPreferVolunteersOps } from "./volunteers-intent.ts";

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

function hasEventScope(
  question: string,
  pathname: string | null | undefined,
  events?: ResolvableEventLite[],
): boolean {
  if (extractEventIdFromPathname(pathname)) {
    return true;
  }
  if (events && questionNamesSpecificEvent(question, events)) {
    return true;
  }
  return false;
}

/** Phase 3 volunteers / communications status intents (not how-to). */
export function isVolunteersOrCommsOpsIntent(question: string): boolean {
  return shouldPreferVolunteersOps(question) || shouldPreferCommsOps(question);
}

/**
 * Phase 4 content write/rewrite path.
 * Wins over FAQ and the event-pathname ops catch-all; does not steal ops/org status asks.
 */
export function shouldRouteToContentAsk(question: string): boolean {
  return shouldPreferContentAsk(question);
}

/**
 * Org / role briefing path — even without an event name.
 * Event-scoped phrasing (named event) stays on Phase 1 ops.
 * Phase 3 volunteer/comms without event scope also uses the enriched org pack.
 */
export function shouldRouteToOrgBriefing(
  question: string,
  events?: ResolvableEventLite[],
  pathname?: string | null,
): boolean {
  if (shouldRouteToContentAsk(question)) {
    return false;
  }

  if (shouldPreferOrgBriefing(question)) {
    if (events && questionNamesSpecificEvent(question, events)) {
      return false;
    }
    return true;
  }

  // Phase 3: org-level volunteers/comms when not event-scoped.
  if (isVolunteersOrCommsOpsIntent(question)) {
    if (hasEventScope(question, pathname, events)) {
      return false;
    }
    // Navigation how-tos (“Where do I find volunteers?”) stay FAQ.
    if (isHowToNavigationQuestion(question) && !isOpsIntent(question)) {
      return false;
    }
    return true;
  }

  return false;
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
  if (shouldRouteToContentAsk(question)) {
    return false;
  }
  if (shouldRouteToOrgBriefing(question, events, pathname)) {
    return false;
  }
  if (isVolunteersOrCommsOpsIntent(question)) {
    return true;
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
