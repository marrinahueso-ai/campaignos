/**
 * Volunteer / shift / committee coverage intents for Ask Ralli Phase 3.
 * Keep patterns operational — clear how-tos stay on the product-help FAQ path.
 */

import {
  isHowToNavigationQuestion,
  normalizeAskText,
} from "./ops-intent.ts";

const VOLUNTEERS_PATTERNS: RegExp[] = [
  /\bneed( more)? volunteers?\b/i,
  /\bmore volunteers?\b/i,
  /\bdo i need (more )?volunteers?\b/i,
  /\bvolunteer (coverage|gaps?|status|needs?|shortage)\b/i,
  /\b(enough|short on) volunteers?\b/i,
  /\bwhich shifts?\b/i,
  /\bshifts? (still )?(need|needing|open|unfilled|empty)\b/i,
  /\b(open|unfilled) (spots?|shifts?)\b/i,
  /\bvolunteers? (haven'?t|have not) responded\b/i,
  /\bwhich volunteers? (haven'?t|have not)\b/i,
  /\bnon[- ]?responders?\b/i,
  /\b(signup|sign[- ]up) reminder\b/i,
  /\bvolunteer (signup |sign[- ]up )?reminder\b/i,
  /\banother (signup |sign[- ]up )?reminder\b/i,
  /\bcommittee chairs? assigned volunteers?\b/i,
  /\bchairs? assigned volunteers?\b/i,
  /\bwhich committee is behind\b/i,
  /\bcommittee(s)? (behind|short|understaffed)\b/i,
  /\bvolunteer signup\b/i,
];

/** Operational volunteer / shift / committee staffing question. */
export function isVolunteersIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return VOLUNTEERS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Prefer volunteer ops over FAQ when the question is status-shaped.
 * e.g. “Where do I find volunteers?” stays product-help.
 */
export function shouldPreferVolunteersOps(question: string): boolean {
  if (!isVolunteersIntent(question)) return false;
  if (
    isHowToNavigationQuestion(question) &&
    /\bwhere (do|can|is|are)\b/i.test(normalizeAskText(question))
  ) {
    return false;
  }
  return true;
}
