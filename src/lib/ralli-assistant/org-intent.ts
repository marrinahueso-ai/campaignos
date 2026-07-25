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
  // today's / todays / today summary (natural word order + typos)
  /\b(give me |what('?s|s| is) )?today'?s? summary\b/i,
  /\b(give me |show me |what('?s|s| is) )?(a |my )?summary (of |for )?today\b/i,
  /\bsummary (of |for )?today\b/i,
  /\btoday'?s? briefing\b/i,
  /\bbrief(ing)? (for |of )?today\b/i,
  /\bwhat happened this week\b/i,
  /\bwhat do i have (this|next) week\b/i,
  // “what do I have to do next week?” (ops “do next” must not steal this)
  /\bwhat do i have to do (this|next) week\b/i,
  /\bwhat (do|should) i (need to )?do (this|next) week\b/i,
  /\bwhat('?s|s| is) (on )?(my )?(calendar |schedule |plate )?(this|next) week\b/i,
  /\b(this|next) week('?s?)? (summary|briefing|review|plan|priorities)\b/i,
  /\bcoming up (this|next) week\b/i,
  /\bfor (this|next) week\b/i,
  /\bweek in review\b/i,
  /\bbusiest (week|day)\b/i,
  /\bwhich committees? need\b/i,
  /\bcommittees? need(ing)? help\b/i,
  /\b(board|president|chair|communications chair) (briefing|summary)\b/i,
  /\bgive me (a |my )?(briefing|overview|status|summary)\b/i,
  /\bwhat('?s|s| is) on my plate\b/i,
  /\bwhat should i focus on today\b/i,
  /\bwhat should i work on today\b/i,
  /\bwhat should i (finish|do) before i leave\b/i,
  /\bwhat('?s|s| is) my biggest priority\b/i,
  /\bbiggest priority\b/i,
  /\bwhat('?s|s| is) overdue\b/i,
  /\bam i behind\b/i,
  /\bwhat changed since yesterday\b/i,
  /\bcan you summarize everything\b/i,
  /\bsummarize everything\b/i,
  /\bwhat should i send this week\b/i,
  /\bwhat should i post today\b/i,
  /\bhow is (our |my )?organization doing\b/i,
  /\borganization (health|doing)\b/i,
  /\bwhat needs my attention today\b/i,
  /\bneeds my attention\b/i,
  /\bwhat('?s|s| is) falling behind\b/i,
  /\bfalling behind\b/i,
  /\bare we on track\b/i,
  /\bcatch me up\b/i,
  /\bgive me (my |a )?daily briefing\b/i,
  /\bdaily briefing\b/i,
  /\bwhat did i miss\b/i,
  /\bwhat('?s|s| is) happening (this week|next week|tomorrow)\b/i,
  /\bhappening (this|next) week\b/i,
  /\bhappening tomorrow\b/i,
  /\bbefore i log off\b/i,
  /\bbefore i leave\b/i,
  /\bwhat should i finish\b/i,
  /\bdo we have any conflicts\b/i,
  /\bschedule conflicts?\b/i,
  /\bwhat('?s|s| is) waiting for approval\b/i,
  /\bwaiting for approval\b/i,
  /\bwhat would you do\b/i,
  /\bwhat('?s|s| is) your recommendation\b/i,
  /\bwhat('?s|s| is) the smartest next step\b/i,
  /\bsmartest next step\b/i,
  /\bwhere should i focus first\b/i,
  /\bif you were me\b/i,
  /\bwhat would make (the )?biggest difference\b/i,
  /\bone thing i can do today\b/i,
  /\bhow would you handle this\b/i,
];

/** True when the user wants a prioritized action list for today / now. */
export function isOrgPriorityListIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return (
    /\bwhat should i (work on|focus on|do) today\b/i.test(normalized) ||
    /\bwhat should i (finish|do) before i (leave|log off)\b/i.test(normalized) ||
    /\bbefore i log off\b/i.test(normalized) ||
    /\bwhat needs my attention today\b/i.test(normalized) ||
    /\bwhat('?s|s| is) my biggest priority\b/i.test(normalized) ||
    /\bbiggest priority\b/i.test(normalized) ||
    /\bwhat('?s|s| is) (the )?next best thing\b/i.test(normalized) ||
    /\bpriorit(y|ies) (for )?today\b/i.test(normalized) ||
    /\bwhat would you do\b/i.test(normalized) ||
    /\bwhat('?s|s| is) your recommendation\b/i.test(normalized) ||
    /\bwhat('?s|s| is) the smartest next step\b/i.test(normalized) ||
    /\bsmartest next step\b/i.test(normalized) ||
    /\bwhere should i focus first\b/i.test(normalized) ||
    /\bif you were me\b/i.test(normalized) ||
    /\bwhat would make (the )?biggest difference\b/i.test(normalized) ||
    /\bone thing i can do today\b/i.test(normalized) ||
    /\bhow would you handle this\b/i.test(normalized)
  );
}

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
