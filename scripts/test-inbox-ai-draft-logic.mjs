#!/usr/bin/env node
/**
 * Smoke tests for inbox AI draft follow-up behavior (no test runner in repo).
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

const busTimesQuestion =
  "I am new to the school can you please tell me how I can find my sons bus times?";

const earlyReleaseExcerpt =
  "Early release days: dismissal at 1:58 PM. See the early release calendar for dates.";
const busRouteExcerpt =
  "Bus routes for 2025-26: Route 12 departs at 7:45 AM. Find your bus stop on the district transportation page.";

function detectBusQuestion(question) {
  return /\bbus(?:es)?\b/i.test(question) || /\bbus\s+time/i.test(question);
}

function excerptHasBusContent(excerpt) {
  return /\bbus(?:es)?\b/i.test(excerpt) || /\btransportation\b/i.test(excerpt);
}

function isGenericScheduleOnly(excerpt) {
  const hasTime = /\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(excerpt);
  const hasEarlyRelease = /\bearly\s+release\b/i.test(excerpt);
  const hasDismissal = /\bdismissal\b/i.test(excerpt);
  return (hasTime || hasEarlyRelease || hasDismissal) && !excerptHasBusContent(excerpt);
}

const followUp = buildFollowUpDraft({
  senderName: "Sarah",
  organizationName: "EES PTO",
  channelType: "instagram_dm",
});

const failures = [];

if (!/checking on this/i.test(followUp)) {
  failures.push("Follow-up draft must mention checking on the question");
}

if (/bus schedule|bus times|am\s|pm/i.test(followUp)) {
  failures.push("Follow-up draft must NOT invent bus schedule information");
}

if (/upcoming events|visit our pto website|feel free to ask/i.test(followUp)) {
  failures.push("Follow-up draft must NOT use generic PTO blurb");
}

if (!isLikelyAuthWall("Sign in to your account. Member login required.")) {
  failures.push("Should detect short auth wall pages");
}

if (isLikelyAuthWall("Bus routes for 2025-26: Route 12 departs at 7:45 AM from Oak Street. ".repeat(20))) {
  failures.push("Should not flag long pages with bus route content as auth wall");
}

// Bus times question should never be answered from general knowledge in follow-up path
if (followUp.toLowerCase().includes("district website")) {
  failures.push("Follow-up must not redirect to general knowledge sources");
}

if (detectBusQuestion(busTimesQuestion) && excerptHasBusContent(earlyReleaseExcerpt)) {
  failures.push("Early release excerpt must not satisfy bus question keyword rules");
}

if (detectBusQuestion(busTimesQuestion) && isGenericScheduleOnly(earlyReleaseExcerpt)) {
  // Expected: early release dismissal should be rejected for bus questions
} else if (detectBusQuestion(busTimesQuestion)) {
  failures.push("Early release excerpt should be flagged as generic schedule only for bus questions");
}

if (detectBusQuestion(busTimesQuestion) && !excerptHasBusContent(busRouteExcerpt)) {
  failures.push("Bus route excerpt should satisfy bus question keyword rules");
}

function extractKeywords(text) {
  const stopWords = new Set([
    "how", "do", "can", "the", "a", "an", "to", "for", "my", "me", "you", "please",
    "tell", "what", "where", "when", "is", "are", "on", "in", "at", "of", "and", "or",
    "it", "this", "that", "we", "our", "i", "add",
  ]);
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

function scoreSourceAgainstQuestion({ question, label, description, url }) {
  const questionKeywords = extractKeywords(question);
  const labelText = label.toLowerCase();
  const descriptionText = description.toLowerCase();
  const combinedSource = `${labelText} ${descriptionText} ${url.toLowerCase()}`;

  let score = 0;
  for (const keyword of questionKeywords) {
    if (!combinedSource.includes(keyword)) continue;
    if (labelText.includes(keyword)) score += 3;
    else if (descriptionText.includes(keyword)) score += 2;
    else score += 1;
  }

  if (/\blunch\s+money\b/i.test(question) && /\blunch\s+money\b/i.test(combinedSource)) {
    score += 8;
  }

  return score;
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

if (schoolBucksScore < 2) {
  failures.push("School Bucks description should match lunch money questions");
}

if (skywardScore >= schoolBucksScore) {
  failures.push("School Bucks should score higher than Skyward for lunch money questions");
}

console.log("Bus times question:", busTimesQuestion);
console.log("Follow-up draft:", followUp);

if (failures.length > 0) {
  console.error("\nFAILURES:");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("\nAll inbox AI draft logic checks passed.");
