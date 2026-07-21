import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import {
  formatAmbiguousEventAnswer,
  formatNoEventAnswer,
  resolveEventFromQuestion,
  toEventOptions,
  type AskRalliEventOption,
  type ResolvableEvent,
} from "@/lib/ralli-assistant/event-resolver";
import {
  buildEventInsightsContextPack,
  buildOrgInsightsContextPack,
} from "@/lib/ralli-assistant/insights-context";
import {
  buildInsightsLinks,
  formatDeterministicInsightsAnswer,
  serializeInsightsContextForPrompt,
  type InsightsContextPack,
} from "@/lib/ralli-assistant/insights-format";
import { isEventScopedInsightsQuestion } from "@/lib/ralli-assistant/insights-intent";
import { extractEventIdFromPathname } from "@/lib/ralli-assistant/ops-intent";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export interface AskRalliInsightsResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  eventOptions: AskRalliEventOption[];
  source: "insights";
  error: string | null;
}

function buildInsightsSystemPrompt(): string {
  return [
    "You are Ask Ralli AI — an operational coach for Hey Ralli (CampaignOS).",
    "Answer ONLY from the provided INSIGHTS CONTEXT JSON. Do not invent risks, health scores, Meta metrics, or missing pieces.",
    "When meta.available is false, say you don’t have performance data yet and fall back to highestImpactOpsAction / nextAction.",
    "Prefer concrete risks and the single highest-impact next step. Name real events and items from the context.",
    "Keep answers to 3–6 short sentences or a tight bullet list. Use short paragraphs or bullets — easy to scan.",
    "Do NOT write markdown links like [Insights](/insights). Destinations appear as separate buttons — refer to areas by name only.",
    "You are not drafting social posts — only health, risk, and performance guidance.",
  ].join("\n");
}

function questionNamesEvent(
  question: string,
  events: ResolvableEvent[],
): boolean {
  if (events.length === 0) return false;
  const resolution = resolveEventFromQuestion(question, events, null);
  return resolution.kind === "matched";
}

function shouldUseEventInsightsPack(
  question: string,
  pathname: string | null | undefined,
  events: ResolvableEvent[],
): boolean {
  if (extractEventIdFromPathname(pathname)) return true;
  if (questionNamesEvent(question, events)) return true;
  return isEventScopedInsightsQuestion(question);
}

async function answerFromPack(
  question: string,
  pack: InsightsContextPack,
): Promise<AskRalliInsightsResult> {
  if (!isAiConfigured()) {
    return {
      success: true,
      answer: formatDeterministicInsightsAnswer(pack),
      links: pack.links,
      eventOptions: [],
      source: "insights",
      error: null,
    };
  }

  const result = await generateText({
    systemPrompt: buildInsightsSystemPrompt(),
    userPrompt: [
      `User question: ${question}`,
      "",
      "INSIGHTS CONTEXT (authoritative — answer only from this):",
      serializeInsightsContextForPrompt(pack),
    ].join("\n"),
    maxTokens: 400,
    temperature: 0.2,
    model: resolveFastDraftModel(),
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: true,
      answer: formatDeterministicInsightsAnswer(pack),
      links: pack.links,
      eventOptions: [],
      source: "insights",
      error: null,
    };
  }

  return {
    success: true,
    answer: result.text.trim(),
    links: pack.links,
    eventOptions: [],
    source: "insights",
    error: null,
  };
}

export async function askRalliInsightsCoach(input: {
  question: string;
  pathname?: string | null;
  eventId?: string | null;
}): Promise<AskRalliInsightsResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: [],
      source: "insights",
      error: "Ask a health, risk, or performance question.",
    };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return {
      success: false,
      answer: null,
      links: buildInsightsLinks(null),
      eventOptions: [],
      source: "insights",
      error: "Join or select an organization to ask for insights.",
    };
  }

  let events: ResolvableEvent[] = [];
  try {
    const active = await getActiveEvents(membership.organizationId);
    events = active.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      status: event.status,
    }));
  } catch (error) {
    console.error("Ask Ralli insights: failed to load events", error);
    events = [];
  }

  const useEventPack =
    Boolean(input.eventId) ||
    shouldUseEventInsightsPack(question, input.pathname, events);

  if (useEventPack) {
    const resolution = resolveEventFromQuestion(
      question,
      events,
      input.pathname,
      input.eventId,
    );

    if (resolution.kind === "ambiguous") {
      return {
        success: true,
        answer: formatAmbiguousEventAnswer(resolution.candidates),
        links: [],
        eventOptions: toEventOptions(resolution.candidates),
        source: "insights",
        error: null,
      };
    }

    if (resolution.kind === "matched") {
      try {
        const pack = await buildEventInsightsContextPack(resolution.event);
        return answerFromPack(question, pack);
      } catch (error) {
        console.error("Ask Ralli insights: event pack failed", error);
        return {
          success: true,
          answer: [
            `I found ${resolution.event.title}, but couldn’t load health/insights just now.`,
            "Open the event page or Insights, or ask again in a moment.",
          ].join(" "),
          links: buildInsightsLinks(resolution.event.id),
          eventOptions: [],
          source: "insights",
          error: null,
        };
      }
    }

    // Event-shaped question without a resolvable event.
    if (isEventScopedInsightsQuestion(question) && !input.eventId) {
      return {
        success: true,
        answer: [
          "I can check campaign health once I know which event you mean.",
          "Open an event page, or name the campaign (for example: “Is Back to School Fair healthy?”).",
        ].join(" "),
        links: [
          { label: "Campaigns", href: "/events" },
          { label: "Insights", href: "/insights" },
          { label: "Today", href: "/dashboard" },
        ],
        eventOptions: [],
        source: "insights",
        error: null,
      };
    }

    if (resolution.kind === "none" && resolution.reason === "no_match") {
      return {
        success: true,
        answer: formatNoEventAnswer(resolution.reason),
        links: [
          { label: "Campaigns", href: "/events" },
          { label: "Insights", href: "/insights" },
          { label: "Approvals", href: "/approvals" },
        ],
        eventOptions: [],
        source: "insights",
        error: null,
      };
    }
  }

  try {
    const pack = await buildOrgInsightsContextPack();
    return answerFromPack(question, pack);
  } catch (error) {
    console.error("Ask Ralli insights: org pack failed", error);
    return {
      success: true,
      answer: [
        "I couldn’t load organization insights just now.",
        "Try Insights or Today, or ask again shortly.",
      ].join(" "),
      links: buildInsightsLinks(null),
      eventOptions: [],
      source: "insights",
      error: null,
    };
  }
}
