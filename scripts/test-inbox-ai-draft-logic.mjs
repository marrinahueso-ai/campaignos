#!/usr/bin/env node
/**
 * Smoke tests for inbox AI draft logic (no test runner in repo).
 * Run: node scripts/test-inbox-ai-draft-logic.mjs
 */

function buildFollowUpDraft({ senderName, organizationName, channelType }) {
  const greeting = senderName?.trim()
    ? `Hey ${senderName.trim()}!`
    : "Hey!";

  switch (channelType) {
    case "instagram_dm":
    case "facebook_message":
      return `${greeting} Good question — I'm checking on this and we'll get back to you soon!`;
    case "instagram_comment":
    case "facebook_comment":
      return `Good question! I'm checking on this and we'll follow up soon.`;
    default:
      return `${greeting} Good question — I'm checking on this and we'll get back to you soon!`;
  }
}

function buildAcknowledgementDraft({ messageBody, senderName, channelType }) {
  const body = messageBody.toLowerCase();
  const isPublicComment =
    channelType === "instagram_comment" || channelType === "facebook_comment";

  if (/\b(?:thank you|thanks|thx|ty)\b/.test(body)) {
    return isPublicComment
      ? "Aw, thanks so much — we really appreciate it!"
      : senderName?.trim()
        ? `Aw, thanks ${senderName.trim()} — we really appreciate it!`
        : "Aw, thanks so much — we really appreciate it!";
  }

  if (/\blogo\b/.test(body)) {
    return isPublicComment
      ? "Thanks! We're so glad you like the logo — that really means a lot!"
      : "Aw, thanks so much! We're really proud of the logo too!";
  }

  if (/\b(?:team|community|volunteer|pto)\b/.test(body)) {
    return isPublicComment
      ? "Thanks — we love this community too!"
      : "Aw, thanks! We feel the same way about this team!";
  }

  return isPublicComment
    ? "Thanks so much — that really means a lot to us!"
    : "Aw, thanks so much — that really means a lot!";
}

function messageNeedsSourceAnswer(message) {
  const text = message.trim();
  if (!text) return false;

  const lower = text.toLowerCase();

  if (isComplimentOrSocialComment(lower)) return false;

  const infoRequestPatterns = [
    /\?\s*$/,
    /\bhow\s+(?:do|can|to|much|many|long)\b/,
    /\bwhere\s+(?:do|can|is|are|to)\b/,
    /\bwhat\s+(?:is|are|time|date|day|cost|price)\b/,
    /\bwhen\s+(?:is|are|does|do|can|will)\b/,
    /\bwho\s+(?:is|are|do|can)\b/,
    /\bwhy\s+(?:is|are|do|does|can)\b/,
    /\b(can|could)\s+you\b/,
    /\bplease\s+(?:tell|send|share|let me know)\b/,
    /\b(?:do you|does anyone)\s+know\b/,
    /\b(?:need to know|looking for|trying to find|help me find|sign up|register for|find out)\b/,
    /\b(?:how much|cost|price|deadline|schedule|hours|location|address|phone number|email)\b/,
    /\b(?:lunch money|school bucks|bus route|bus stop|bus time|after.?school|before.?school|sacc|report card|attendance)\b/,
  ];

  return infoRequestPatterns.some((pattern) => pattern.test(lower));
}

function isComplimentOrSocialComment(lower) {
  const hasQuestionMark = /\?/.test(lower);
  const hasInfoRequest =
    /\b(how|where|when|what time|what is|what are|can you|could you|please tell|do you know|need to know|looking for|sign up|register|find out|help me)\b/.test(
      lower,
    );

  if (hasQuestionMark || hasInfoRequest) return false;

  const praisePatterns = [
    /\b(?:thank you|thanks|thx|ty)\b/,
    /\b(?:great|awesome|amazing|love|loved|beautiful|wonderful|fantastic|fabulous|nice|good job|well done|way to go|so proud|keep up)\b/,
    /\b(?:looks great|looks amazing|looks wonderful|looks beautiful|looks awesome)\b/,
    /\bwhat a (?:great|beautiful|wonderful|amazing|fantastic|nice)\b/,
    /\b(?:feel like|feels like)\b.*\b(?:team|community|family)\b/,
    /\b(?:working to make|making things better|making a difference)\b/,
  ];

  return praisePatterns.some((pattern) => pattern.test(lower));
}

function isLikelyAuthWall(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (normalized.length < 80) return true;

  const authPatterns = [
    /\b(sign in|log in|login required|member login|members only)\b/,
    /\b(please log in|please sign in|authentication required)\b/,
    /\b(access denied|unauthorized|forbidden)\b/,
  ];

  const authHits = authPatterns.filter((pattern) => pattern.test(normalized)).length;
  return authHits >= 2 || (authHits >= 1 && normalized.length < 400);
}

const STOP_WORDS = new Set([
  "how", "do", "does", "can", "the", "a", "an", "to", "for", "my", "me", "you", "please",
  "tell", "what", "where", "when", "is", "are", "on", "in", "at", "of", "and", "or",
  "it", "this", "that", "we", "our", "i", "add", "who", "why", "was", "were", "your",
  "am", "be", "get", "find", "could", "would", "should", "did",
]);

const GENERIC_KEYWORDS = new Set([
  "great", "good", "awesome", "amazing", "love", "loved", "nice", "wonderful", "fantastic",
  "beautiful", "fabulous", "thanks", "thank", "team", "working", "work", "things", "better",
  "feel", "feels", "like", "proud", "job", "keep", "really", "very", "much", "just", "so",
  "well", "done",
]);

const PHRASE_BONUSES = [
  { phrase: /\blunch\s+money\b/i, bonus: 8 },
  { phrase: /\bschool\s+bucks\b/i, bonus: 6 },
  { phrase: /\bsacc\b/i, bonus: 6 },
];

const SOURCE_MATCH_MIN_SCORE = 4;

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 && !STOP_WORDS.has(word) && !GENERIC_KEYWORDS.has(word),
    );
}

function scoreSourceAgainstQuestion({ question, label, description, url }) {
  const questionKeywords = extractKeywords(question);
  if (questionKeywords.length === 0) return 0;

  const labelText = label.toLowerCase();
  const descriptionText = description.toLowerCase();
  const combinedSource = `${labelText} ${descriptionText} ${url.toLowerCase()}`;

  let score = 0;
  let labelHits = 0;
  let phraseBonus = 0;

  for (const keyword of questionKeywords) {
    if (!combinedSource.includes(keyword)) continue;
    if (labelText.includes(keyword)) {
      score += 3;
      labelHits += 1;
    } else if (descriptionText.includes(keyword)) {
      score += 2;
    } else {
      score += 1;
    }
  }

  const questionLower = question.toLowerCase();
  for (const { phrase, bonus } of PHRASE_BONUSES) {
    if (phrase.test(questionLower) && phrase.test(combinedSource)) {
      phraseBonus += bonus;
    }
  }

  score += phraseBonus;

  const effectiveMinScore =
    labelHits > 0 && score >= 3 ? 3 : SOURCE_MATCH_MIN_SCORE;

  if (score < effectiveMinScore) return 0;
  if (labelHits === 0 && phraseBonus === 0) return 0;

  return score;
}

const failures = [];

const logoCompliment =
  "what a great logo, I feel like a team working to make things better";

if (messageNeedsSourceAnswer(logoCompliment)) {
  failures.push("Logo compliment should NOT need a source answer");
}

const logoDraft = buildAcknowledgementDraft({
  messageBody: logoCompliment,
  channelType: "facebook_comment",
});

if (/faculty|favorites|gift|http/i.test(logoDraft)) {
  failures.push("Logo compliment acknowledgement must not mention Faculty Favorites or links");
}

if (!/logo|thanks|glad/i.test(logoDraft)) {
  failures.push("Logo compliment acknowledgement should thank and mention logo");
}

const facultyFavoritesScore = scoreSourceAgainstQuestion({
  question: logoCompliment,
  label: "Faculty Favorites",
  description:
    "Gift ideas and preferences for our amazing staff and teachers — support the team!",
  url: "https://ptoees.membershiptoolkit.com/teachersfavorites2026",
});

if (facultyFavoritesScore > 0) {
  failures.push(
    `Faculty Favorites should NOT match logo compliment (score=${facultyFavoritesScore})`,
  );
}

const lunchQuestion = "How do I add lunch money";
const schoolBucksScore = scoreSourceAgainstQuestion({
  question: lunchQuestion,
  label: "School Bucks",
  description: "Add lunch money and pay for school meals online",
  url: "https://schoolbucks.example.com",
});
const skywardScore = scoreSourceAgainstQuestion({
  question: lunchQuestion,
  label: "Skyward",
  description: "Student portal for grades, attendance, and family information",
  url: "https://skyward.example.com",
});

if (!messageNeedsSourceAnswer(lunchQuestion)) {
  failures.push("Lunch money question should need a source answer");
}

if (schoolBucksScore < SOURCE_MATCH_MIN_SCORE) {
  failures.push("School Bucks should match lunch money questions");
}

if (skywardScore >= schoolBucksScore) {
  failures.push("School Bucks should score higher than Skyward for lunch money questions");
}

const saccQuestion = "When does SACC start?";
const saccScore = scoreSourceAgainstQuestion({
  question: saccQuestion,
  label: "SACC",
  description: "After-school care program — registration, hours, and calendar",
  url: "https://example.com/sacc",
});

if (!messageNeedsSourceAnswer(saccQuestion)) {
  failures.push("SACC question should need a source answer");
}

if (saccScore < 3) {
  failures.push("SACC source should match SACC questions");
}

const busTimesQuestion =
  "I am new to the school can you please tell me how I can find my sons bus times?";

const followUp = buildFollowUpDraft({
  senderName: "Sarah",
  organizationName: "EES PTO",
  channelType: "instagram_dm",
});

if (!/checking on this/i.test(followUp)) {
  failures.push("Follow-up draft must mention checking on the question");
}

if (/bus schedule|bus times|am\s|pm/i.test(followUp)) {
  failures.push("Follow-up draft must NOT invent bus schedule information");
}

if (!isLikelyAuthWall("Sign in to your account. Member login required.")) {
  failures.push("Should detect short auth wall pages");
}

console.log("Logo compliment draft:", logoDraft);
console.log("School Bucks score:", schoolBucksScore);
console.log("SACC score:", saccScore);

if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("\nAll inbox AI draft logic checks passed.");
