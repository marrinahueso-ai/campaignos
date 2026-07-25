/**
 * Intent detection for Ask Ralli Phase 1 ops coach vs product-help FAQ.
 * Ops intents win over FAQ keyword collisions (e.g. "approvals" / "tasks").
 */

const HOW_TO_PATTERNS: RegExp[] = [
  /\bhow (do|can|to|should) (i|we|you)\b/i,
  /\bwhere (do|can|is|are|will) (i|we|my|the)\b/i,
  /\bwhere (is|are)\b/i,
  /\bwhat is (create with ai|the communications hub|ai brain)\b/i,
  /\bwhat('s| is) the difference\b/i,
  /\bdifference between\b/i,
  /\bhow does .+ work\b/i,
  /\bexplain how\b/i,
];

const OPS_PATTERNS: RegExp[] = [
  /\bwhat (should|do) i (have to )?do next\b/i,
  // what's / whats / what is next (ASCII or after curly→ASCII normalize)
  /\bwhat('?s|s| is) next\b/i,
  /\bnext (step|action|thing)\b/i,
  /\bwhat (do|should) i (focus|work) on\b/i,
  /\bwhat .+ (do i|i) need to do\b/i,
  /\boverdue\b/i,
  /\bbehind schedule\b/i,
  /\bon schedule\b/i,
  /\bwaiting (for|on) approval\b/i,
  /\bneeds? approval\b/i,
  /\bpending approval\b/i,
  /\bchanges requested\b/i,
      /\bwhat('?s|s| is) (still )?waiting\b/i,
  /\bpublishing (today|tomorrow|this week)\b/i,
  /\b(what('?s|s| is)|anything) publishing\b/i,
  /\bscheduled (today|tomorrow|this week|for today)\b/i,
  /\bgoing out (today|tomorrow|this week)\b/i,
  /\bevent ready\b/i,
  /\bis (this |the )?event ready\b/i,
  /\bready (for|to)\b/i,
  /\bincomplete tasks?\b/i,
  /\btasks? (still )?(incomplete|open|left|remaining)\b/i,
  /\bwhat tasks?\b/i,
  /\bstatus (of|for|on)\b/i,
  /\bhow('?s|s| is) .+ (going|looking)\b/i,
  /\bwhat('?s|s| is) (left|outstanding|remaining)\b/i,
  /\bam i (on track|ready|caught up)\b/i,
  /\battention\b/i,
  /\bis (this |the )?event ready\b/i,
  /\bwhat still needs to be finished\b/i,
  /\bstill needs to be finished\b/i,
  /\bhow many volunteers (do we |do i )?still need\b/i,
  /\bvolunteers? (do we |do i )?still need\b/i,
  /\bshould i start promoting\b/i,
  /\bstart promoting this\b/i,
  /\bwhat('?s|s| is) my next deadline\b/i,
  /\bnext deadline\b/i,
  /\bhow much time do i have left\b/i,
  /\btime (do i )?have left\b/i,
  /\bwhat('?s|s| is) wrong with this event\b/i,
  /\bwrong with this event\b/i,
  /\bdid i miss something\b/i,
  /\bwho('?s|s| is) working on this\b/i,
  /\bwho needs to approve\b/i,
  /\bwhy can('?t| not) i publish\b/i,
  /\benough volunteers\b/i,
  /\bdo i have enough volunteers\b/i,
  // Milestone progress for a campaign (not Create with AI how-to)
  /\bmilestones? (done|complete|finished|ready|left|remaining|open|status|progress)\b/i,
  /\b(are |is )?(all )?(my |our |the )?milestones? (done|complete|finished|ready|left|remaining)\b/i,
  /\b(done|complete|finished) .{0,40}\bmilestones?\b/i,
];

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "to",
  "of",
  "on",
  "in",
  "at",
  "my",
  "our",
  "me",
  "i",
  "we",
  "is",
  "are",
  "am",
  "do",
  "does",
  "what",
  "whats",
  "should",
  "next",
  "this",
  "that",
  "and",
  "or",
  "with",
  "about",
  "how",
  "where",
  "when",
  "why",
  "can",
  "please",
  "tell",
  "give",
  "show",
  "me",
  "event",
  "events",
  "campaign",
  "campaigns",
  "still",
  "any",
  "have",
  // Product-domain words that often appear in questions AND event titles
  // (e.g. “Volunteer Badge Making”) — must not alone drive fuzzy event match.
  "volunteer",
  "volunteers",
  "approval",
  "approvals",
  "task",
  "tasks",
  "reminder",
  "reminders",
  "committee",
  "committees",
  "signup",
  "signups",
  "communication",
  "communications",
  "calendar",
  "schedule",
  "scheduling",
  "publish",
  "publishing",
  "draft",
  "drafts",
  "flyer",
  "flyers",
  "caption",
  "captions",
  "email",
  "emails",
  "post",
  "posts",
  "social",
  "status",
  "going",
  "progress",
]);

export function normalizeAskText(question: string): string {
  return question
    .toLowerCase()
    // Smart/curly quotes → ASCII so "what's" / "today's" keep matching intents
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
    .replace(/[^\p{L}\p{N}\s?/'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clearly a product how-to / navigation question. */
export function isHowToNavigationQuestion(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return HOW_TO_PATTERNS.some((pattern) => pattern.test(normalized));
}

/** Operational status / planning / approvals / schedule intent. */
export function isOpsIntent(question: string): boolean {
  const normalized = normalizeAskText(question);
  if (!normalized) return false;
  return OPS_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Prefer FAQ only when the question is clearly how-to and not operational.
 * Prevents FAQ keywords from swallowing “what should I do next…”.
 */
export function shouldPreferProductHelpFaq(question: string): boolean {
  return isHowToNavigationQuestion(question) && !isOpsIntent(question);
}

/** Significant tokens from the question for event title matching. */
export function extractQueryTokens(question: string): string[] {
  const normalized = normalizeAskText(question);
  if (!normalized) return [];

  return normalized
    .split(" ")
    .map((token) =>
      token
        .replace(/^['"?]+|['"?]+$/g, "")
        .replace(/'/g, ""),
    )
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

const NON_EVENT_ID_SEGMENTS = new Set([
  "create",
  "new",
  "import",
  "calendar",
]);

export function extractEventIdFromPathname(
  pathname?: string | null,
): string | null {
  if (!pathname) return null;
  const match = pathname.match(/^\/events\/([^/?#]+)(?:\/|$|\?)/);
  const segment = match?.[1] ?? null;
  if (!segment || NON_EVENT_ID_SEGMENTS.has(segment.toLowerCase())) {
    return null;
  }
  // Require a plausible id length (uuid / cuid-like), not a lone word tab.
  if (segment.length < 8) {
    return null;
  }
  return segment;
}
