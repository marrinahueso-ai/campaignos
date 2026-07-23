import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import {
  shouldRouteToContentAsk,
  shouldRouteToInsightsAsk,
  shouldRouteToOpsAsk,
  shouldRouteToOrgBriefing,
} from "@/lib/ralli-assistant/ask-routing";
import { askRalliContentCoach } from "@/lib/ralli-assistant/content-ask";
import { askRalliInsightsCoach } from "@/lib/ralli-assistant/insights-ask";
import { askRalliOpsCoach } from "@/lib/ralli-assistant/ops-ask";
import {
  extractEventIdFromPathname,
  isOpsIntent,
  shouldPreferProductHelpFaq,
} from "@/lib/ralli-assistant/ops-intent";
import { shouldPreferOrgBriefing } from "@/lib/ralli-assistant/org-intent";
import { askRalliOrgBriefing } from "@/lib/ralli-assistant/org-ask";
import { prepareAnswerForDisplay } from "@/lib/ralli-assistant/answer-display";
import type { AskRalliEventOption } from "@/lib/ralli-assistant/event-resolver";
import {
  buildProductHelpSystemPrompt,
  formatTopicAnswer,
  matchProductHelpTopic,
  type ProductHelpLink,
} from "@/lib/ralli-assistant/product-help-knowledge";

export type AskRalliSource =
  | "faq"
  | "ai"
  | "ops"
  | "org"
  | "content"
  | "insights";

export type { AskRalliEventOption };

export interface AskRalliAssistantResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  /** When set, widget shows dated chips that re-ask with that eventId. */
  eventOptions: AskRalliEventOption[];
  source: AskRalliSource | null;
  error: string | null;
}

function withDisplayPolish(result: {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  eventOptions?: AskRalliEventOption[];
  source: AskRalliSource | null;
  error: string | null;
}): AskRalliAssistantResult {
  const eventOptions = result.eventOptions ?? emptyEventOptions();
  const links = result.links ?? [];
  const hasChips = links.length > 0 || eventOptions.length > 0;
  return {
    success: result.success,
    answer: result.answer
      ? prepareAnswerForDisplay(result.answer, { hasLinkChips: hasChips })
      : result.answer,
    links,
    eventOptions,
    source: result.source,
    error: result.error,
  };
}

function emptyEventOptions(): AskRalliEventOption[] {
  return [];
}

export {
  shouldRouteToContentAsk,
  shouldRouteToInsightsAsk,
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
  /** When set (e.g. user picked an ambiguous match), skip fuzzy resolve. */
  eventId?: string | null;
}): Promise<AskRalliAssistantResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: emptyEventOptions(),
      source: null,
      error: "Ask a question about using Hey Ralli.",
    };
  }

  const events = await loadResolvableEvents();
  const eventId = input.eventId?.trim() || null;

  // Phase 4 content drafts win over FAQ (e.g. Create with AI keywords)
  // and the event-pathname ops catch-all — but not over ops/org status asks.
  if (shouldRouteToContentAsk(question)) {
    return withDisplayPolish(
      await askRalliContentCoach({
        question,
        pathname: input.pathname,
        eventId,
      }),
    );
  }

  // Phase 5 insights / health / risk — before org/ops so risk/health
  // questions are not swallowed by pathname ops catch-all.
  if (shouldRouteToInsightsAsk(question)) {
    return withDisplayPolish(
      await askRalliInsightsCoach({
        question,
        pathname: input.pathname,
        eventId,
      }),
    );
  }

  // Ops / org coaches always win over FAQ keyword collisions
  // (e.g. "need to do" → tasks, "this week" → calendar).
  if (shouldRouteToOrgBriefing(question, events, input.pathname)) {
    return withDisplayPolish(await askRalliOrgBriefing({ question }));
  }

  if (shouldRouteToOpsAsk(question, input.pathname, events) || eventId) {
    return withDisplayPolish(
      await askRalliOpsCoach({
        question,
        pathname: input.pathname,
        eventId,
      }),
    );
  }

  // Intent-only fallbacks when event list failed to load or name didn't resolve.
  if (shouldPreferOrgBriefing(question)) {
    return withDisplayPolish(await askRalliOrgBriefing({ question }));
  }

  if (
    isOpsIntent(question) ||
    Boolean(extractEventIdFromPathname(input.pathname))
  ) {
    return withDisplayPolish(
      await askRalliOpsCoach({
        question,
        pathname: input.pathname,
        eventId,
      }),
    );
  }

  const matched = matchProductHelpTopic(question);
  if (matched && shouldPreferProductHelpFaq(question)) {
    return withDisplayPolish({
      success: true,
      answer: formatTopicAnswer(matched),
      links: matched.links,
      eventOptions: emptyEventOptions(),
      source: "faq",
      error: null,
    });
  }

  if (matched) {
    return withDisplayPolish({
      success: true,
      answer: formatTopicAnswer(matched),
      links: matched.links,
      eventOptions: emptyEventOptions(),
      source: "faq",
      error: null,
    });
  }

  if (!isAiConfigured()) {
    return withDisplayPolish({
      success: true,
      answer: [
        "I can help with how to use Hey Ralli — creating campaigns, finding Approvals, Create with AI, Calendar, and more.",
        "I can also brief your org (“What needs my approval?”, “Do I need more volunteers?”) or answer event questions when you name an event or open an event page.",
        "Try one of the suggested questions, or ask something like “Where do I find my approvals?”",
        "AI Brain is separate: use Settings → AI Brain for brand voice and training content.",
      ].join(" "),
      links: [
        { label: "Approvals", href: "/approvals" },
        { label: "Today", href: "/dashboard" },
        { label: "Communications Hub", href: "/communications" },
        { label: "Create Campaign", href: "/events/create" },
        { label: "AI Brain", href: "/settings/ai-brain" },
      ],
      eventOptions: emptyEventOptions(),
      source: "faq",
      error: null,
    });
  }

  const membership = await getActiveMembership();
  const result = await generateText({
    systemPrompt: buildProductHelpSystemPrompt(input.pathname),
    userPrompt: question,
    maxTokens: 350,
    temperature: 0.3,
    model: resolveFastDraftModel(),
    usage: {
      actionType: "ask_ralli",
      organizationId: membership?.organizationId ?? null,
      eventId: input.eventId ?? null,
      feature: "ask_ralli_product_help",
    },
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: emptyEventOptions(),
      source: null,
      error:
        result.error ??
        "I couldn’t answer that just now. Try rephrasing, or open Approvals / Campaigns from the left nav.",
    };
  }

  return withDisplayPolish({
    success: true,
    answer: result.text.trim(),
    links: [],
    eventOptions: emptyEventOptions(),
    source: "ai",
    error: null,
  });
}
