import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import {
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "@/lib/ralli-assistant/ask-routing";
import { askRalliOpsCoach } from "@/lib/ralli-assistant/ops-ask";
import {
  extractEventIdFromPathname,
  isOpsIntent,
  shouldPreferProductHelpFaq,
} from "@/lib/ralli-assistant/ops-intent";
import { askRalliOrgBriefing } from "@/lib/ralli-assistant/org-ask";
import {
  buildProductHelpSystemPrompt,
  formatTopicAnswer,
  matchProductHelpTopic,
  type ProductHelpLink,
} from "@/lib/ralli-assistant/product-help-knowledge";

export type AskRalliSource = "faq" | "ai" | "ops" | "org";

export interface AskRalliAssistantResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: AskRalliSource | null;
  error: string | null;
}

export {
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "@/lib/ralli-assistant/ask-routing";

async function loadResolvableEvents(): Promise<
  Array<{ id: string; title: string; date: string; status: string }>
> {
  try {
    const membership = await getActiveMembership();
    if (!membership) return [];
    const active = await getActiveEvents(membership.organizationId);
    return active.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      status: event.status,
    }));
  } catch (error) {
    console.error("Ask Ralli: failed to load events for routing", error);
    return [];
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

  const events = await loadResolvableEvents();

  // Phase 2: org / role briefings without requiring an event name.
  // Named-event phrasing still takes the Phase 1 event ops path.
  if (shouldRouteToOrgBriefing(question, events)) {
    return askRalliOrgBriefing({ question });
  }

  if (shouldRouteToOpsAsk(question, input.pathname, events)) {
    return askRalliOpsCoach({
      question,
      pathname: input.pathname,
    });
  }

  // Ops intent or event page even when event list failed to load.
  if (
    isOpsIntent(question) ||
    Boolean(extractEventIdFromPathname(input.pathname))
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
        "I can also brief your org (“What needs my approval?”, “Give me today’s summary”) or answer event questions when you name an event or open an event page.",
        "Try one of the suggested questions, or ask something like “Where do I find my approvals?”",
        "AI Brain is separate: use Settings → AI Brain for brand voice and training content.",
      ].join(" "),
      links: [
        { label: "Approvals", href: "/approvals" },
        { label: "Today", href: "/dashboard" },
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
