/**
 * Communications depth intents for Ask Ralli Phase 3
 * (email / social / flyers / milestones — not content rewrite).
 */

import {
  isHowToNavigationQuestion,
  normalizeAskText,
} from "./ops-intent.ts";

const COMMS_PATTERNS: RegExp[] = [
  /\bhave i emailed (families|parents|everyone)\b/i,
  /\bemailed (families|parents)\b/i,
  /\bemail(ed)? (the )?(families|parents) yet\b/i,
  /\bdid i (email|post)\b/i,
  /\bpost(ed)? on facebook\b/i,
  /\bhave i posted\b/i,
  /\bsocial posts? (are |still )?missing\b/i,
  /\bmissing (social )?posts?\b/i,
  /\bwhich (social )?posts? (are )?(missing|left|outstanding)\b/i,
  /\bmilestone (should i |to )?publish\b/i,
  /\bwhich milestone (should i|to) publish\b/i,
  /\bpublish( today| tomorrow)\b/i,
  /\bwhat (should i|to) publish (today|tomorrow)\b/i,
  /\bcommunication (is )?due (next|today|tomorrow)\b/i,
  /\bwhat communication (is )?due\b/i,
  /\bwhat('s| is) (the )?next communication\b/i,
  /\bwhat (should i|to) send (today|tomorrow|next)\b/i,
  /\bsend tomorrow\b/i,
  /\bhave i reminded volunteers\b/i,
  /\breminded volunteers\b/i,
  /\bvolunteer reminder (sent|email|post)\b/i,
  /\bemails? (are |still )?(in )?drafts?\b/i,
  /\bwhich emails? (are )?(still )?(drafts?|draft)\b/i,
  /\bdraft emails?\b/i,
  /\bflyers? (haven'?t|have not|not) (been )?(created|made|done)\b/i,
  /\bwhich flyers?\b/i,
  /\bflyers? (still )?(missing|needed|outstanding)\b/i,
  /\b(family|families) (email|emails|newsletter)\b/i,
];

/** Operational communications status question (not content write/rewrite). */
export function isCommsIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return COMMS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Prefer ops/org communications path over FAQ when the question is status-shaped.
 * Clear how-to (“Where is the Communications Hub?”) stays FAQ.
 */
export function shouldPreferCommsOps(question: string): boolean {
  if (!isCommsIntent(question)) return false;
  if (
    isHowToNavigationQuestion(question) &&
    /\bwhere (do|can|is|are)\b/i.test(normalizeAskText(question))
  ) {
    return false;
  }
  if (
    isHowToNavigationQuestion(question) &&
    /\bwhat is (the )?communications hub\b/i.test(normalizeAskText(question))
  ) {
    return false;
  }
  return true;
}
