const STOP_WORDS = new Set([
  "how",
  "do",
  "does",
  "did",
  "can",
  "could",
  "would",
  "should",
  "the",
  "a",
  "an",
  "to",
  "for",
  "my",
  "me",
  "you",
  "your",
  "please",
  "tell",
  "what",
  "where",
  "when",
  "who",
  "why",
  "is",
  "are",
  "was",
  "were",
  "on",
  "in",
  "at",
  "of",
  "and",
  "or",
  "it",
  "this",
  "that",
  "we",
  "our",
  "i",
  "am",
  "be",
  "get",
  "find",
]);

/** Phrase overlap between question and source text earns a strong bonus. */
const PHRASE_BONUSES: Array<{ phrase: RegExp; bonus: number }> = [
  { phrase: /\blunch\s+money\b/i, bonus: 8 },
  { phrase: /\bschool\s+bucks\b/i, bonus: 6 },
  { phrase: /\bmeal\s+(?:payment|pay|account)\b/i, bonus: 6 },
  { phrase: /\bbus\s+(?:route|routes|stop|stops|time|times|schedule)\b/i, bonus: 6 },
  { phrase: /\bbefore\s+(?:school|care)\b/i, bonus: 5 },
  { phrase: /\bafter\s+(?:school|care)\b/i, bonus: 5 },
  { phrase: /\b(?:report\s+card|grades?|attendance)\b/i, bonus: 5 },
];

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/** Score how well a configured source matches a parent question (label + description + URL only). */
export function scoreSourceAgainstQuestion(input: {
  question: string;
  label: string;
  description: string;
  url: string;
}): number {
  const questionKeywords = extractKeywords(input.question);
  if (questionKeywords.length === 0) {
    return 0;
  }

  const labelText = input.label.toLowerCase();
  const descriptionText = input.description.toLowerCase();
  const urlText = input.url.toLowerCase();
  const combinedSource = `${labelText} ${descriptionText} ${urlText}`;

  let score = 0;

  for (const keyword of questionKeywords) {
    if (!combinedSource.includes(keyword)) {
      continue;
    }

    if (labelText.includes(keyword)) {
      score += 3;
    } else if (descriptionText.includes(keyword)) {
      score += 2;
    } else {
      score += 1;
    }
  }

  const questionLower = input.question.toLowerCase();
  for (const { phrase, bonus } of PHRASE_BONUSES) {
    if (phrase.test(questionLower) && phrase.test(combinedSource)) {
      score += bonus;
    }
  }

  return score;
}

/** Minimum keyword score to treat a source as a match without LLM confirmation. */
export const SOURCE_MATCH_MIN_SCORE = 2;

export function buildDescriptionFallbackExcerpt(input: {
  label: string;
  description: string;
  url: string;
}): string {
  const description = input.description.trim();
  const detail = description || input.label.trim();
  return `${input.label} — ${detail}. Link: ${input.url}`;
}
