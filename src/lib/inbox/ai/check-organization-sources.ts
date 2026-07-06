import "server-only";

import { generateText } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  buildDescriptionFallbackExcerpt,
  scoreSourceAgainstQuestion,
  SOURCE_MATCH_MIN_SCORE,
} from "@/lib/inbox/ai/question-topic-matching";
import { messageNeedsSourceAnswer } from "@/lib/inbox/ai/message-intent";
import type { OrderedInboxAiSource } from "@/lib/organizations/inbox-ai-sources/queries";
import type {
  InboxAiSourceCheckRecord,
  InboxAiSourceUsed,
} from "@/types/inbox-ai-sources";

interface SourceMatchCandidate {
  answer: NonNullable<InboxAiSourceUsed["answerFrom"]>;
  score: number;
}

/** Keyword overlap on label + description + URL. */
const KEYWORD_MATCH_SCORE_BASE = 100;
/** LLM confirmed relevance when keywords alone are inconclusive. */
const LLM_MATCH_SCORE = 75;

export async function checkOrganizationSources(input: {
  question: string;
  sources: OrderedInboxAiSource[];
}): Promise<InboxAiSourceUsed> {
  if (!messageNeedsSourceAnswer(input.question)) {
    return {
      sourcesChecked: input.sources.map((source) => ({
        label: source.label.trim() || source.label,
        url: source.url,
        sourceType: source.sourceType,
        checked: false,
        answerFound: false,
      })),
      answerFrom: null,
      noAnswerFound: true,
    };
  }

  const sourcesChecked: InboxAiSourceCheckRecord[] = [];
  const candidates: SourceMatchCandidate[] = [];

  for (const source of input.sources) {
    const label = source.label.trim();
    const description = source.description?.trim() ?? "";

    const record: InboxAiSourceCheckRecord = {
      label: label || source.label,
      url: source.url,
      sourceType: source.sourceType,
      checked: true,
      answerFound: false,
    };

    if (!label) {
      sourcesChecked.push(record);
      continue;
    }

    const keywordScore = scoreSourceAgainstQuestion({
      question: input.question,
      label,
      description,
      url: source.url,
    });

    if (keywordScore >= SOURCE_MATCH_MIN_SCORE) {
      const match: SourceMatchCandidate = {
        answer: {
          label,
          url: source.url,
          excerpt: buildDescriptionFallbackExcerpt({
            label,
            description: description || label,
            url: source.url,
          }),
          fromDescription: true,
        },
        score: KEYWORD_MATCH_SCORE_BASE + keywordScore,
      };

      candidates.push(match);
      record.answerFound = true;
      record.usedDescriptionFallback = true;
      record.descriptionUsed = description || null;
    }

    sourcesChecked.push(record);
  }

  if (candidates.length === 0) {
    for (const source of input.sources) {
      const label = source.label.trim();
      const description = source.description?.trim() ?? "";

      if (!label || !description) {
        continue;
      }

      const llmMatch = await matchQuestionToSourceDescription({
        question: input.question,
        label,
        description,
        url: source.url,
      });

      if (!llmMatch) {
        continue;
      }

      const record = sourcesChecked.find(
        (entry) => entry.url === source.url && entry.label === (label || source.label),
      );

      candidates.push({
        answer: {
          label,
          url: source.url,
          excerpt: buildDescriptionFallbackExcerpt({
            label,
            description,
            url: source.url,
          }),
          fromDescription: true,
        },
        score: LLM_MATCH_SCORE,
      });

      if (record) {
        record.answerFound = true;
        record.usedDescriptionFallback = true;
        record.descriptionUsed = description;
      }
    }
  }

  const answerFrom = pickBestCandidate(candidates);

  return {
    sourcesChecked,
    answerFrom,
    noAnswerFound: answerFrom === null,
  };
}

function pickBestCandidate(
  candidates: SourceMatchCandidate[],
): InboxAiSourceUsed["answerFrom"] {
  if (candidates.length === 0) {
    return null;
  }

  const best = candidates.reduce((current, candidate) =>
    candidate.score > current.score ? candidate : current,
  );

  return best.answer;
}

async function matchQuestionToSourceDescription(input: {
  question: string;
  label: string;
  description: string;
  url: string;
}): Promise<boolean> {
  const generation = await generateText({
    systemPrompt: `You decide whether a configured school source is the best place to answer a parent question.
Reply with ONLY "yes" or "no".
- yes ONLY if the source label and description clearly indicate this source helps with the parent's question.
- no if the source is unrelated, too generic, or only tangentially related.
- no if the message is a compliment, thank-you, or social comment with no information request.`,
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
