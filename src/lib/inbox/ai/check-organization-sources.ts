import "server-only";

import { generateText } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { fetchPublicPageText } from "@/lib/inbox/ai/fetch-page-text";
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
      sourcesChecked.push(record);
      continue;
    }

    if (!fetched.text.trim()) {
      record.fetchError = "No readable text found";
      sourcesChecked.push(record);
      continue;
    }

    const analysis = await analyzeSourceForQuestion({
      question: input.question,
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

async function analyzeSourceForQuestion(input: {
  question: string;
  sourceLabel: string;
  sourceUrl: string;
  pageText: string;
}): Promise<SourceAnalysisResult> {
  const snippet = input.pageText.slice(0, 8_000);

  const generation = await generateText({
    systemPrompt: `You evaluate whether a school/PTO web page contains a factual answer to a parent question.
Return JSON only: {"answerFound": boolean, "excerpt": string|null}
- answerFound is true ONLY when the page clearly contains specific facts that answer the question.
- excerpt must quote or closely paraphrase ONLY facts present in the page text (max 400 chars).
- If dates, times, locations, prices, deadlines, or policies are not explicitly on the page, answerFound must be false.
- Never invent information.`,
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

  return parseAnalysisJson(generation.text);
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
