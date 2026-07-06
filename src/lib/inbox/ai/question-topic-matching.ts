export interface QuestionTopic {
  id: string;
  label: string;
  detectInQuestion: RegExp[];
  requireInContent: RegExp[];
}

/** Topics that require matching keywords in source excerpts — not generic times alone. */
export const QUESTION_TOPICS: QuestionTopic[] = [
  {
    id: "bus_transportation",
    label: "bus routes, bus times, or school transportation",
    detectInQuestion: [
      /\bbus(?:es)?\b/i,
      /\btransportation\b/i,
      /\bschool\s+bus\b/i,
      /\bbus\s+(?:route|routes|stop|stops|time|times|schedule|number|pickup|pick-up|dropoff|drop-off)\b/i,
    ],
    requireInContent: [
      /\bbus(?:es)?\b/i,
      /\btransportation\b/i,
      /\bschool\s+bus\b/i,
      /\bbus\s+(?:route|routes|stop|stops|time|times|schedule|number)\b/i,
      /\broute\s+\d+/i,
    ],
  },
  {
    id: "lunch_money",
    label: "lunch money, meal payments, or cafeteria account funding",
    detectInQuestion: [
      /\blunch\s+money\b/i,
      /\bmeal\s+(?:payment|pay|account|money)\b/i,
      /\bcafeteria\b/i,
      /\bfood\s+(?:account|service)\b/i,
      /\badd\s+money\b/i,
      /\baccount\s+money\b/i,
      /\bpay\s+(?:for\s+)?(?:lunch|meals?)\b/i,
    ],
    requireInContent: [
      /\blunch\b/i,
      /\bmeal\b/i,
      /\bmeals\b/i,
      /\bfood\b/i,
      /\bcafeteria\b/i,
      /\bpayment\b/i,
      /\bpay\b/i,
      /\baccount\b/i,
      /\bmoney\b/i,
      /\bschool\s*bucks\b/i,
      /\bmyschoolbucks\b/i,
    ],
  },
  {
    id: "grades_attendance",
    label: "grades, attendance, or student academic records",
    detectInQuestion: [
      /\bgrades?\b/i,
      /\battendance\b/i,
      /\breport\s+card\b/i,
      /\bacademic\b/i,
      /\bstudent\s+info\b/i,
    ],
    requireInContent: [
      /\bgrades?\b/i,
      /\battendance\b/i,
      /\bstudent\b/i,
      /\bportal\b/i,
      /\bskyward\b/i,
      /\bacademic\b/i,
    ],
  },
  {
    id: "before_after_care",
    label: "before school or after school care",
    detectInQuestion: [
      /\bbefore\s+(?:school|care)\b/i,
      /\bafter\s+(?:school|care)\b/i,
      /\bsacc\b/i,
      /\bchildcare\b/i,
      /\bextended\s+day\b/i,
    ],
    requireInContent: [
      /\bbefore\b/i,
      /\bafter\b/i,
      /\bcare\b/i,
      /\bsacc\b/i,
      /\bchildcare\b/i,
    ],
  },
];

const GENERIC_SCHEDULE_PATTERNS = [
  /\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i,
  /\bdismissal\b/i,
  /\bearly\s+release\b/i,
  /\bhalf[\s-]day\b/i,
];

export function detectQuestionTopics(question: string): QuestionTopic[] {
  return QUESTION_TOPICS.filter((topic) =>
    topic.detectInQuestion.some((pattern) => pattern.test(question)),
  );
}

export function formatQuestionTopicLabel(topics: QuestionTopic[]): string | null {
  if (topics.length === 0) {
    return null;
  }

  return topics.map((topic) => topic.label).join("; ");
}

function contentMatchesTopic(text: string, topic: QuestionTopic): boolean {
  return topic.requireInContent.some((pattern) => pattern.test(text));
}

export function excerptMatchesQuestionTopics(
  excerpt: string,
  topics: QuestionTopic[],
): boolean {
  if (topics.length === 0) {
    return true;
  }

  return topics.every((topic) => contentMatchesTopic(excerpt, topic));
}

/** True when text is mostly generic schedule/dismissal info without topic-specific keywords. */
export function isGenericScheduleOnly(text: string, topics: QuestionTopic[]): boolean {
  if (topics.length === 0) {
    return false;
  }

  const hasGenericSchedule = GENERIC_SCHEDULE_PATTERNS.some((pattern) =>
    pattern.test(text),
  );
  if (!hasGenericSchedule) {
    return false;
  }

  return !excerptMatchesQuestionTopics(text, topics);
}

export function passesTopicKeywordRules(input: {
  question: string;
  excerpt: string;
}): boolean {
  const topics = detectQuestionTopics(input.question);
  if (topics.length === 0) {
    return true;
  }

  if (!excerptMatchesQuestionTopics(input.excerpt, topics)) {
    return false;
  }

  if (isGenericScheduleOnly(input.excerpt, topics)) {
    return false;
  }

  return true;
}

/** Match a question topic to a source label + description without scraping the page. */
export function sourceDescriptionMatchesQuestion(input: {
  question: string;
  label: string;
  description: string;
  url?: string;
}): boolean {
  const topics = detectQuestionTopics(input.question);
  if (topics.length === 0) {
    return false;
  }

  const sourceText = `${input.label} ${input.description} ${input.url ?? ""}`.trim();
  if (!sourceText) {
    return false;
  }

  return topics.every((topic) => contentMatchesTopic(sourceText, topic));
}

export function buildDescriptionFallbackExcerpt(input: {
  label: string;
  description: string;
  url: string;
}): string {
  const description = input.description.trim();
  return `${input.label}: ${description}. Visit ${input.url}`;
}
