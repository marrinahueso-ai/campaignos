import { formatEventChipLabel } from "./answer-display.ts";
import {
  extractEventIdFromPathname,
  extractQueryTokens,
} from "./ops-intent.ts";

export interface ResolvableEvent {
  id: string;
  title: string;
  date: string;
  status: string;
}

/** Structured choice when fuzzy match finds more than one event. */
export interface AskRalliEventOption {
  eventId: string;
  title: string;
  date: string;
}

export type EventResolution =
  | { kind: "matched"; event: ResolvableEvent }
  | { kind: "ambiguous"; candidates: ResolvableEvent[] }
  | { kind: "none"; reason: "no_event_context" | "no_match" };

function scoreEventTitle(title: string, tokens: string[]): number {
  const normalizedTitle = title.toLowerCase();
  if (!normalizedTitle.trim() || tokens.length === 0) {
    return 0;
  }

  let score = 0;
  let matchedTokens = 0;

  for (const token of tokens) {
    if (normalizedTitle.includes(token)) {
      matchedTokens += 1;
      score += token.length >= 5 ? 2 : 1;
    }
  }

  // Prefer titles that contain a multi-token phrase from the query.
  if (matchedTokens >= 2) {
    const phrase = tokens.join(" ");
    if (normalizedTitle.includes(phrase)) {
      score += 5;
    }
    score += matchedTokens;
  }

  // Exact-ish: all tokens present and title is short enough to be intentional.
  if (matchedTokens === tokens.length && tokens.length >= 2) {
    score += 3;
  }

  return score;
}

/**
 * Resolve an event from an explicit override, pathname, and/or fuzzy title match.
 * `forcedEventId` wins (skips ambiguity). Otherwise pathname `/events/{id}` wins
 * when that id is in the candidate list.
 */
export function resolveEventFromQuestion(
  question: string,
  events: ResolvableEvent[],
  pathname?: string | null,
  forcedEventId?: string | null,
): EventResolution {
  if (forcedEventId) {
    const forced = events.find((event) => event.id === forcedEventId);
    if (forced) {
      return { kind: "matched", event: forced };
    }
    return { kind: "none", reason: "no_match" };
  }

  const pathEventId = extractEventIdFromPathname(pathname);
  if (pathEventId) {
    const fromPath = events.find((event) => event.id === pathEventId);
    if (fromPath) {
      return { kind: "matched", event: fromPath };
    }
    // Path id present but not in accessible list — still treat as none for safety.
  }

  const tokens = extractQueryTokens(question);
  if (tokens.length === 0 || events.length === 0) {
    return {
      kind: "none",
      reason: pathEventId ? "no_match" : "no_event_context",
    };
  }

  const scored = events
    .map((event) => ({ event, score: scoreEventTitle(event.title, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.event.title.localeCompare(b.event.title));

  if (scored.length === 0) {
    return { kind: "none", reason: "no_match" };
  }

  const best = scored[0]!;
  const runnersUp = scored.filter(
    (entry) => entry.score === best.score && entry.event.id !== best.event.id,
  );

  // Require at least a modest score so single common tokens don't false-match.
  const minScore = tokens.length >= 2 ? 2 : 3;
  if (best.score < minScore) {
    return { kind: "none", reason: "no_match" };
  }

  if (runnersUp.length > 0) {
    return {
      kind: "ambiguous",
      candidates: [best.event, ...runnersUp.map((entry) => entry.event)].slice(
        0,
        5,
      ),
    };
  }

  // Near-ties within 1 point also ask for clarification, unless the best
  // title contains every query token and runners-up do not.
  const bestTitle = best.event.title.toLowerCase();
  const bestContainsAllTokens = tokens.every((token) =>
    bestTitle.includes(token),
  );
  const nearTies = scored.filter((entry) => {
    if (entry.event.id === best.event.id) return false;
    if (best.score - entry.score > 1) return false;
    if (bestContainsAllTokens) {
      const title = entry.event.title.toLowerCase();
      const containsAll = tokens.every((token) => title.includes(token));
      if (!containsAll) return false;
    }
    return true;
  });
  if (nearTies.length > 0 && best.score < 10) {
    return {
      kind: "ambiguous",
      candidates: [best.event, ...nearTies.map((entry) => entry.event)].slice(
        0,
        5,
      ),
    };
  }

  return { kind: "matched", event: best.event };
}

export function toEventOptions(
  candidates: ResolvableEvent[],
  limit = 5,
): AskRalliEventOption[] {
  return candidates.slice(0, limit).map((event) => ({
    eventId: event.id,
    title: event.title,
    date: event.date,
  }));
}

/** Chip label including date so duplicate titles are distinguishable. */
export function formatEventOptionChipLabel(option: AskRalliEventOption): string {
  return formatEventChipLabel(option.title, option.date);
}

export function formatAmbiguousEventAnswer(
  candidates: ResolvableEvent[],
): string {
  const lines = candidates.map(
    (event) => `• ${formatEventChipLabel(event.title, event.date)}`,
  );
  return [
    "I found more than one matching event. Which one did you mean?",
    "",
    ...lines,
    "",
    "Pick one below to continue with your question.",
  ].join("\n");
}

export function formatNoEventAnswer(
  reason: "no_event_context" | "no_match",
): string {
  if (reason === "no_match") {
    return [
      "I couldn’t match that to an event in your organization.",
      "Name the event (for example, “What should I do next for Back to School Fair?”) or open the event page and ask again.",
    ].join(" ");
  }

  return [
    "Tell me which event you mean, or open an event page and ask from there.",
    "For example: “What should I do next for Back to School Fair?”",
  ].join(" ");
}
