import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import {
  formatAmbiguousEventAnswer,
  formatNoEventAnswer,
  resolveEventFromQuestion,
  type ResolvableEvent,
} from "@/lib/ralli-assistant/event-resolver";
import { buildOpsContextPack } from "@/lib/ralli-assistant/ops-context";
import {
  formatDeterministicOpsAnswer,
  serializeOpsContextForPrompt,
} from "@/lib/ralli-assistant/ops-context-format";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export interface AskRalliOpsResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: "ops";
  error: string | null;
}

function buildOpsSystemPrompt(): string {
  return [
    "You are Ask Ralli AI — an operational coach for Hey Ralli (CampaignOS).",
    "Answer ONLY from the provided EVENT CONTEXT JSON. Do not invent tasks, approvals, schedules, or readiness facts.",
    "If a section is empty, say so plainly. Prefer concrete next steps and name real items from the context.",
    "Keep answers to 3–6 short sentences or a tight bullet list.",
    "When recommending an action, point to the matching deep link from context.links (label + href).",
    "You are not drafting social posts or artwork — only operational guidance.",
  ].join("\n");
}

export async function askRalliOpsCoach(input: {
  question: string;
  pathname?: string | null;
}): Promise<AskRalliOpsResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "ops",
      error: "Ask an operational question about an event.",
    };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "ops",
      error: "Join or select an organization to ask about event status.",
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
    console.error("Ask Ralli ops: failed to load events", error);
    events = [];
  }

  const resolution = resolveEventFromQuestion(
    question,
    events,
    input.pathname,
  );

  if (resolution.kind === "ambiguous") {
    return {
      success: true,
      answer: formatAmbiguousEventAnswer(resolution.candidates),
      links: resolution.candidates.slice(0, 3).map((event) => ({
        label: event.title,
        href: `/events/${event.id}`,
      })),
      source: "ops",
      error: null,
    };
  }

  if (resolution.kind === "none") {
    return {
      success: true,
      answer: formatNoEventAnswer(resolution.reason),
      links: [
        { label: "Campaigns", href: "/events" },
        { label: "Tasks", href: "/tasks" },
        { label: "Approvals", href: "/approvals" },
      ],
      source: "ops",
      error: null,
    };
  }

  let pack;
  try {
    pack = await buildOpsContextPack(resolution.event);
  } catch (error) {
    console.error("Ask Ralli ops: failed to build context pack", error);
    return {
      success: true,
      answer: [
        `I found ${resolution.event.title}, but couldn’t load its operational details just now.`,
        "Open the event page and try Tasks or Approvals, or ask again in a moment.",
      ].join(" "),
      links: [
        { label: "Event page", href: `/events/${resolution.event.id}` },
        { label: "Approvals", href: "/approvals" },
        { label: "Tasks", href: "/tasks" },
      ],
      source: "ops",
      error: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      success: true,
      answer: formatDeterministicOpsAnswer(pack),
      links: pack.links,
      source: "ops",
      error: null,
    };
  }

  const result = await generateText({
    systemPrompt: buildOpsSystemPrompt(),
    userPrompt: [
      `User question: ${question}`,
      "",
      "EVENT CONTEXT (authoritative — answer only from this):",
      serializeOpsContextForPrompt(pack),
    ].join("\n"),
    maxTokens: 400,
    temperature: 0.2,
    model: resolveFastDraftModel(),
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: true,
      answer: formatDeterministicOpsAnswer(pack),
      links: pack.links,
      source: "ops",
      error: null,
    };
  }

  return {
    success: true,
    answer: result.text.trim(),
    links: pack.links,
    source: "ops",
    error: null,
  };
}
