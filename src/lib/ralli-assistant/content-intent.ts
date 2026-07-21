/**
 * Content write/rewrite/generate intents for Ask Ralli Phase 4.
 * Routes to existing caption/draft generators — not product-help FAQ.
 */

import {
  isHowToNavigationQuestion,
  normalizeAskText,
} from "./ops-intent.ts";

export type ContentActionKind =
  | "write_reminder"
  | "write_volunteer_reminder"
  | "rewrite"
  | "improve_flyer"
  | "another_version";

export type ContentToneHint =
  | "professional"
  | "exciting"
  | "concise"
  | null;

export type ContentLengthHint = "short" | "long" | null;

/** Imperative content-creation / revision verbs + targets. */
const CONTENT_PATTERNS: RegExp[] = [
  /\b(write|draft|create|generate)\b.{0,60}\b(reminder|caption|post|flyer|email|message)\b/i,
  /\b(write|draft|create)\b.{0,40}\btomorrow'?s reminder\b/i,
  /\btomorrow'?s reminder\b/i,
  /\bvolunteer reminder\b/i,
  /\brewrite\b/i,
  /\bmake (this|it)\b.{0,40}\b(shorter|longer|exciting|professional|concise|punchy)\b/i,
  /\bmake (this|it) more (exciting|professional|concise|punchy)\b/i,
  /\b(shorter|more exciting|more professional)\b/i,
  /\bimprove (this |the )?(flyer|caption|post|draft|copy)\b/i,
  /\bgenerate another version\b/i,
  /\banother version\b/i,
  /\b(new|fresh) (version|draft|caption)\b/i,
];

/** Status-shaped reminder questions stay on volunteers/comms ops. */
const STATUS_REMINDER_PATTERNS: RegExp[] = [
  /\b(do i|should i) need (another )?(signup |sign[- ]up )?reminder\b/i,
  /\bneed another (signup |sign[- ]up )?reminder\b/i,
  /\bhave i reminded\b/i,
  /\breminded volunteers\b/i,
  /\bvolunteer reminder (sent|email|post)\b/i,
];

export function isContentIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  if (STATUS_REMINDER_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return CONTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Prefer content actions over FAQ / pathname ops catch-all.
 * Clear how-tos (“How do I generate captions?”) stay product-help.
 */
export function shouldPreferContentAsk(question: string): boolean {
  if (!isContentIntent(question)) return false;
  if (isHowToNavigationQuestion(question)) return false;
  return true;
}

export function detectContentActionKind(question: string): ContentActionKind {
  const normalized = normalizeAskText(question);

  if (
    /\bvolunteer reminder\b/i.test(normalized) ||
    (/\b(write|draft|create|generate)\b/i.test(normalized) &&
      /\bvolunteer\b/i.test(normalized) &&
      /\breminder\b/i.test(normalized))
  ) {
    return "write_volunteer_reminder";
  }

  if (
    /\btomorrow'?s reminder\b/i.test(normalized) ||
    (/\b(write|draft|create|generate)\b/i.test(normalized) &&
      /\breminder\b/i.test(normalized))
  ) {
    return "write_reminder";
  }

  if (
    /\bimprove (this |the )?flyer\b/i.test(normalized) ||
    (/\bimprove\b/i.test(normalized) && /\bflyer\b/i.test(normalized))
  ) {
    return "improve_flyer";
  }

  if (
    /\banother version\b/i.test(normalized) ||
    /\b(new|fresh) (version|draft|caption)\b/i.test(normalized)
  ) {
    return "another_version";
  }

  return "rewrite";
}

export function detectContentToneHint(question: string): ContentToneHint {
  const normalized = normalizeAskText(question);
  if (/\b(more )?professional\b/i.test(normalized)) return "professional";
  if (/\b(more )?(exciting|enthusiastic|punchy|energetic)\b/i.test(normalized)) {
    return "exciting";
  }
  if (/\b(shorter|concise|tighter)\b/i.test(normalized)) return "concise";
  return null;
}

export function detectContentLengthHint(question: string): ContentLengthHint {
  const normalized = normalizeAskText(question);
  if (/\b(shorter|brief|concise)\b/i.test(normalized)) return "short";
  if (/\b(longer|more detail)\b/i.test(normalized)) return "long";
  return null;
}

/**
 * Pull pasted draft text from the question (quoted block or text after a colon/newline).
 */
export function extractPastedDraftText(question: string): string | null {
  const trimmed = question.trim();
  if (!trimmed) return null;

  const doubleQuoted = trimmed.match(/"([^"]{12,})"/);
  if (doubleQuoted?.[1]?.trim()) {
    return doubleQuoted[1].trim();
  }

  const singleQuoted = trimmed.match(/'([^']{12,})'/);
  if (singleQuoted?.[1]?.trim()) {
    return singleQuoted[1].trim();
  }

  const afterLabel = trimmed.match(
    /(?:rewrite|improve|make this(?:\s+\w+){0,4}|shorter|caption|draft|text)\s*[:\n]\s*([\s\S]{12,})/i,
  );
  if (afterLabel?.[1]?.trim()) {
    return afterLabel[1].trim();
  }

  // Multi-line: first line is instruction, rest is draft.
  const lines = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const rest = lines.slice(1).join("\n").trim();
    if (rest.length >= 12) return rest;
  }

  return null;
}
