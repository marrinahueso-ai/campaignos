/**
 * Insights / health / risk / performance intents for Ask Ralli Phase 5.
 * Routes to grounded campaign-director + Meta insights packs — not FAQ.
 */

import { extractPastedDraftText } from "./content-intent.ts";
import {
  isHowToNavigationQuestion,
  normalizeAskText,
} from "./ops-intent.ts";

/** Recommendation / health / risk / performance questions. */
const INSIGHTS_PATTERNS: RegExp[] = [
  /\bwhat('?s|s| is) my biggest risk\b/i,
  /\bbiggest risk\b/i,
  /\bhow can (this |the )?campaign perform better\b/i,
  /\bperform(s|ing)? better\b/i,
  /\bwhat post usually performs? best\b/i,
  /\b(which|what) post(s)? (usually )?(perform|work)s? best\b/i,
  /\bbest[- ]performing post\b/i,
  /\bis (my |this |the )?event healthy\b/i,
  /\bevent healthy\b/i,
  /\bcampaign health\b/i,
  /\bhow healthy (is|are)\b/i,
  /\bwhat('?s|s| is) the highest[- ]impact (thing|action|step)\b/i,
  /\bhighest[- ]impact\b/i,
  /\bwhat should i improve\b/i,
  /\bwhat('?s|s| is) missing from (this |the )?(campaign|event)\b/i,
  /\bmissing from (this |the )?(campaign|event)\b/i,
  /\bis there anything i('?m| am) overlooking\b/i,
  /\banything i('?m| am) overlooking\b/i,
  /\bwhat am i (missing|overlooking)\b/i,
  /\brecommendations? for (this |the )?(campaign|event)\b/i,
];

/**
 * Phrasing that implies a specific event/campaign (vs org-wide).
 * Still needs pathname or event name to resolve.
 */
const EVENT_SCOPED_INSIGHTS_PATTERNS: RegExp[] = [
  /\bis (my |this |the )?event healthy\b/i,
  /\bevent healthy\b/i,
  /\bhow can (this |the )?campaign perform better\b/i,
  /\bwhat('?s|s| is) missing from (this |the )?(campaign|event)\b/i,
  /\bcampaign health\b/i,
  /\bfor (this |the )?(campaign|event)\b/i,
];

export function isInsightsIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return INSIGHTS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** True when the question is about a specific event/campaign health pack. */
export function isEventScopedInsightsQuestion(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return EVENT_SCOPED_INSIGHTS_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );
}

/**
 * “What should I improve?” with pasted draft text belongs to Phase 4 content.
 */
export function insightsYieldsToContentPaste(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!/\bwhat should i improve\b/i.test(normalized)) {
    return false;
  }
  return Boolean(extractPastedDraftText(question));
}

/**
 * Prefer insights over FAQ / pathname ops catch-all.
 * Does not steal content drafts or clear product how-tos.
 */
export function shouldPreferInsightsAsk(question: string): boolean {
  if (!isInsightsIntent(question)) return false;
  if (insightsYieldsToContentPaste(question)) return false;
  if (isHowToNavigationQuestion(question)) return false;
  return true;
}
