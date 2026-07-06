import "server-only";

import { generateText } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { fetchPublicPageText } from "@/lib/inbox/ai/fetch-page-text";
import {
  buildDescriptionFallbackExcerpt,
  detectQuestionTopics,
  formatQuestionTopicLabel,
  passesTopicKeywordRules,
  sourceDescriptionMatchesQuestion,
} from "@/lib/inbox/ai/question-topic-matching";
import type { OrderedInboxAiSource } from "@/lib/organizations/inbox-ai-sources/queries";
import type {
  InboxAiSourceCheckRecord,
  InboxAiSourceUsed,
} from "@/types/inbox-ai-sources";

interface SourceAnalysisResult {
  answerFound: boolean;
  excerpt: string | null;
}

export async function checkOrganizationSources(input: {
  question: string;
  sources: OrderedInboxAiSource[];
}): Promise<InboxAiSourceUsed> {
  const sourcesChecked: InboxAiSourceCheckRecord[] = [];
  let answerFrom: InboxAiSourceUsed["answerFrom"] = null;
  const questionTopics = detectQuestionTopics(input.question);
  const questionTopicLabel = formatQuestionTopicLabel(questionTopics);

  for (const source of input.sources) {
    const record: InboxAiSourceCheckRecord = {
      label: source.label,
      url: source.url,
      sourceType: source.sourceType,
      checked: true,
      answerFound: false,
    };

    const fetched = await fetchPublicPageText(source.url);
    if ("error" in fetched) {
      record.fetchError = fetched.error;
      const descriptionMatch = await tryDescriptionFallback({
        question: input.question,
        source,
      });

      if (descriptionMatch) {
        record.answerFound = true;
        record.descriptionUsed = source.description;
        record.usedDescriptionFallback = true;
        sourcesChecked.push(record);
        answerFrom = descriptionMatch;
        break;
      }

      sourcesChecked.push(record);
      continue;
    }

    if (!fetched.text.trim()) {
      record.fetchError = "No readable text found";
      const descriptionMatch = await tryDescriptionFallback({
        question: input.question,
        source,
      });

      if (descriptionMatch) {
        record.answerFound = true;
        record.descriptionUsed = source.description;
        record.usedDescriptionFallback = true;
        sourcesChecked.push(record);
        answerFrom = descriptionMatch;
        break;
      }

      sourcesChecked.push(record);
      continue;
    }

    const analysis = await analyzeSourceForQuestion({
      question: input.question,
      questionTopicLabel,
      sourceLabel: source.label,
      sourceUrl: source.url,
      pageText: fetched.text,
    });

    record.answerFound = analysis.answerFound;
    sourcesChecked.push(record);

    if (analysis.answerFound && analysis.excerpt) {
      answerFrom = {
        label: source.label,
        url: source.url,
        excerpt: analysis.excerpt,
      };
      break;
    }
  }

  return {
    sourcesChecked,
    answerFrom,
    noAnswerFound: answerFrom === null,
  };
}

async function tryDescriptionFallback(input: {
  question: string;
  source: OrderedInboxAiSource;
}): Promise<InboxAiSourceUsed["answerFrom"]> {
  const description = input.source.description?.trim();
  const label = input.source.label.trim();

  if (!description || !label) {
    return null;
  }

  const keywordMatch = sourceDescriptionMatchesQuestion({
    question: input.question,
    label,
    description,
  });

  const llmMatch =
    keywordMatch ||
    (await matchQuestionToSourceDescription({
      question: input.question,
      label,
      description,
      url: input.source.url,
    }));

  if (!llmMatch) {
    return null;
  }

  return {
    label,
    url: input.source.url,
    excerpt: buildDescriptionFallbackExcerpt({
      label,
      description,
      url: input.source.url,
    }),
    fromDescription: true,
  };
}

async function matchQuestionToSourceDescription(input: {
  question: string;
  label: string;
  description: string;
  url: string;
}): Promise<boolean> {
  const generation = await generateText({
    systemPrompt: `You decide whether a configured school source is the right place to answer a parent question.
Reply with ONLY "yes" or "no".
- yes ONLY if the source label and description clearly indicate this source helps with the parent's question.
- no if the source is unrelated, too generic, or only tangentially related.`,
    userPrompt: `Question: ${input.question}

Source label: ${input.label}
Source description: ${input.description}
Source URL: ${input.url}

Is this source relevant to answering the question?`,
    model: resolveFastDraftModel(),
    maxTokens: 10,
  });

  if (!generation.success || !generation.text?.trim()) {
    return false;
  }

  return generation.text.trim().toLowerCase().startsWith("yes");
}

async function analyzeSourceForQuestion(input: {
  question: string;
  questionTopicLabel: string | null;
  sourceLabel: string;
  sourceUrl: string;
  pageText: string;
}): Promise<SourceAnalysisResult> {
  const snippet = input.pageText.slice(0, 8_000);
  const topicRules = input.questionTopicLabel
    ? `\n- The question is specifically about ${input.questionTopicLabel}. answerFound is true ONLY when the page contains information about that exact topic.
- Do NOT match generic dismissal times, early release schedules, or school hours when the question is about a different topic (e.g. bus routes).
- Do NOT match on time-of-day alone (such as "1:58 PM") unless it directly answers the question topic.`
    : "";

  const generation = await generateText({
    systemPrompt: `You evaluate whether a school/PTO web page contains a factual answer to a parent question.
Return JSON only: {"answerFound": boolean, "excerpt": string|null}
- answerFound is true ONLY when the page clearly contains specific facts that directly answer the question.
- excerpt must quote or closely paraphrase ONLY facts present in the page text (max 400 chars).
- If dates, times, locations, prices, deadlines, or policies are not explicitly on the page, answerFound must be false.
- Never invent information.${topicRules}`,
    userPrompt: `Question from inbox:
${input.question}

Source: ${input.sourceLabel}
URL: ${input.sourceUrl}

Page text:
${snippet}`,
    model: resolveFastDraftModel(),
    maxTokens: 250,
  });

  if (!generation.success || !generation.text?.trim()) {
    return { answerFound: false, excerpt: null };
  }

  const parsed = parseAnalysisJson(generation.text);
  if (!parsed.answerFound || !parsed.excerpt) {
    return { answerFound: false, excerpt: null };
  }

  if (
    !passesTopicKeywordRules({
      question: input.question,
      excerpt: parsed.excerpt,
    })
  ) {
    return { answerFound: false, excerpt: null };
  }

  const isRelevant = await verifyExcerptRelevance({
    question: input.question,
    questionTopicLabel: input.questionTopicLabel,
    excerpt: parsed.excerpt,
  });

  if (!isRelevant) {
    return { answerFound: false, excerpt: null };
  }

  return parsed;
}

async function verifyExcerptRelevance(input: {
  question: string;
  questionTopicLabel: string | null;
  excerpt: string;
}): Promise<boolean> {
  const topicClause = input.questionTopicLabel
    ? ` about ${input.questionTopicLabel}`
    : "";

  const generation = await generateText({
    systemPrompt: `You verify whether a source excerpt directly answers a parent question.
Reply with ONLY "yes" or "no".
- yes ONLY if the excerpt contains specific facts that directly answer the question${topicClause}.
- no if the excerpt is about a different topic (for example, early release dismissal times when asked about bus routes).
- no if the excerpt only mentions generic times, dates, or dismissal schedules unrelated to the question topic.`,
    userPrompt: `Question: ${input.question}

Excerpt from source page:
${input.excerpt}

Does this excerpt directly answer the parent's question?`,
    model: resolveFastDraftModel(),
    maxTokens: 10,
  });

  if (!generation.success || !generation.text?.trim()) {
    return false;
  }

  return generation.text.trim().toLowerCase().startsWith("yes");
}

function parseAnalysisJson(raw: string): SourceAnalysisResult {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { answerFound: false, excerpt: null };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      answerFound?: boolean;
      excerpt?: string | null;
    };

    const excerpt =
      typeof parsed.excerpt === "string" && parsed.excerpt.trim()
        ? parsed.excerpt.trim().slice(0, 400)
        : null;

    return {
      answerFound: Boolean(parsed.answerFound) && Boolean(excerpt),
      excerpt,
    };
  } catch {
    return { answerFound: false, excerpt: null };
  }
}
