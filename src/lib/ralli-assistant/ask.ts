import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import { shouldRouteToOpsAsk } from "@/lib/ralli-assistant/ask-routing";
import { askRalliOpsCoach } from "@/lib/ralli-assistant/ops-ask";
import {
  extractEventIdFromPathname,
  isOpsIntent,
  shouldPreferProductHelpFaq,
} from "@/lib/ralli-assistant/ops-intent";
import {
  buildProductHelpSystemPrompt,
  formatTopicAnswer,
  matchProductHelpTopic,
  type ProductHelpLink,
} from "@/lib/ralli-assistant/product-help-knowledge";

export type AskRalliSource = "faq" | "ai" | "ops";

export interface AskRalliAssistantResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: AskRalliSource | null;
  error: string | null;
}

export { shouldRouteToOpsAsk } from "@/lib/ralli-assistant/ask-routing";

async function questionMentionsOrgEvent(
  question: string,
  pathname?: string | null,
): Promise<boolean> {
  try {
    const membership = await getActiveMembership();
    if (!membership) return false;
    const active = await getActiveEvents(membership.organizationId);
    const events = active.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      status: event.status,
    }));
    return shouldRouteToOpsAsk(question, pathname, events);
  } catch (error) {
    console.error("Ask Ralli: event mention probe failed", error);
    return false;
  }
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
  const preferFaq = Boolean(matched && shouldPreferProductHelpFaq(question));

  // How-to / navigation FAQ wins only when clearly not operational.
  if (preferFaq && matched) {
    return {
      success: true,
      answer: formatTopicAnswer(matched),
      links: matched.links,
      source: "faq",
      error: null,
    };
  }

  const pathOrOpsIntent =
    isOpsIntent(question) ||
    Boolean(extractEventIdFromPathname(input.pathname));

  if (
    pathOrOpsIntent ||
    (await questionMentionsOrgEvent(question, input.pathname))
  ) {
    return askRalliOpsCoach({
      question,
      pathname: input.pathname,
    });
  }

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
        "I can also answer operational questions like “What should I do next for Back to School Fair?” when you name an event or open an event page.",
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
