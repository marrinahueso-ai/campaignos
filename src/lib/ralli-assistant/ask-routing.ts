import { resolveEventFromQuestion } from "./event-resolver.ts";
import { extractEventIdFromPathname, isOpsIntent } from "./ops-intent.ts";

/**
 * Whether this question should take the ops coach path.
 * Pure checks first; optional event-name probe when events are provided.
 */
export function shouldRouteToOpsAsk(
  question: string,
  pathname?: string | null,
  events?: Array<{ id: string; title: string; date: string; status: string }>,
): boolean {
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
