/**
 * Org / role briefing intents for Ask Ralli Phase 2.
 * These answer without requiring an event name; event-scoped phrasing
 * still routes to the Phase 1 event ops path.
 */

import {
  isHowToNavigationQuestion,
  isOpsIntent,
  normalizeAskText,
} from "./ops-intent.ts";

const ORG_BRIEFING_PATTERNS: RegExp[] = [
  /\bwhat needs my approval\b/i,
  /\bneeds? my approval\b/i,
  /\bmy approval(s)? (queue|list)?\b/i,
  /\bapprovals? (assigned to|waiting on) me\b/i,
  /\bwhat('?s|s| is) (in )?my (approval )?queue\b/i,
  /\bwhich events need attention\b/i,
  /\bevents? (that )?need(ing)? attention\b/i,
  /\bneed(ing)? attention\b/i,
  /\bwhat('?s|s| is) behind schedule\b/i,
  /\bbehind schedule\b/i,
  // today's / todays / today summary (typos + missing apostrophe)
  /\b(give me |what('?s|s| is) )?today'?s? summary\b/i,
  /\bsummary for today\b/i,
  /\btoday'?s? briefing\b/i,
  /\bwhat happened this week\b/i,
  /\bwhat do i have (this|next) week\b/i,
  /\bwhat('?s|s| is) (on )?(my )?(calendar |schedule )?this week\b/i,
  /\b(this )?week('?s?)? (summary|briefing|review)\b/i,
  /\bweek in review\b/i,
  /\bbusiest (week|day)\b/i,
  /\bwhich committees? need\b/i,
  /\bcommittees? need(ing)? help\b/i,
  /\b(board|president|chair|communications chair) (briefing|summary)\b/i,
  /\bgive me (a |my )?(briefing|overview|status)\b/i,
  /\bwhat('?s|s| is) on my plate\b/i,
  /\bwhat should i focus on today\b/i,
];

/** Org / role briefing without requiring a named event. */
export function isOrgBriefingIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return ORG_BRIEFING_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Prefer org briefing over FAQ when the question is a role/org summary.
 * How-to navigation still wins when clearly product-help only.
 */
export function shouldPreferOrgBriefing(question: string): boolean {
  if (!isOrgBriefingIntent(question)) return false;
  if (isHowToNavigationQuestion(question) && !isOpsIntent(question)) {
    return false;
  }
  return true;
}
