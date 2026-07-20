import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  buildProductHelpSystemPrompt,
  formatTopicAnswer,
  matchProductHelpTopic,
  type ProductHelpLink,
} from "@/lib/ralli-assistant/product-help-knowledge";

export interface AskRalliAssistantResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: "faq" | "ai" | null;
  error: string | null;
}

export async function askRalliProductHelp(input: {
  question: string;
  pathname?: string | null;
}): Promise<AskRalliAssistantResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      source: null,
      error: "Ask a question about using Hey Ralli.",
    };
  }

  const matched = matchProductHelpTopic(question);
  if (matched) {
    return {
      success: true,
      answer: formatTopicAnswer(matched),
      links: matched.links,
      source: "faq",
      error: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      success: true,
      answer: [
        "I can help with how to use Hey Ralli — creating campaigns, finding Approvals, Create with AI, Calendar, and more.",
        "Try one of the suggested questions, or ask something like “Where do I find my approvals?”",
        "AI Brain is separate: use Settings → AI Brain for brand voice and training content.",
      ].join(" "),
      links: [
        { label: "Approvals", href: "/approvals" },
        { label: "Create Campaign", href: "/events/create" },
        { label: "AI Brain", href: "/settings/ai-brain" },
      ],
      source: "faq",
      error: null,
    };
  }

  const result = await generateText({
    systemPrompt: buildProductHelpSystemPrompt(input.pathname),
    userPrompt: question,
    maxTokens: 350,
    temperature: 0.3,
    model: resolveFastDraftModel(),
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: false,
      answer: null,
      links: [],
      source: null,
      error:
        result.error ??
        "I couldn’t answer that just now. Try rephrasing, or open Approvals / Campaigns from the left nav.",
    };
  }

  return {
    success: true,
    answer: result.text.trim(),
    links: [],
    source: "ai",
    error: null,
  };
}
