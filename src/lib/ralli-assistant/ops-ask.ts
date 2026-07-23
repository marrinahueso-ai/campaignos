import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { getActiveEvents } from "@/lib/events/queries";
import {
  formatEventChipLabel,
  formatEventDateLabel,
} from "@/lib/ralli-assistant/answer-display";
import {
  formatAmbiguousEventAnswer,
  formatNoEventAnswer,
  resolveEventFromQuestion,
  toEventOptions,
  type AskRalliEventOption,
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
  eventOptions: AskRalliEventOption[];
  source: "ops";
  error: string | null;
}

function buildOpsSystemPrompt(): string {
  return [
    "You are Ask Ralli AI — an operational coach for Hey Ralli (CampaignOS).",
    "Answer ONLY from the provided EVENT CONTEXT JSON. Do not invent tasks, approvals, schedules, volunteer counts, posts, or readiness facts.",
    "Use volunteers and communications sections when the question is about shifts, SignUpGenius, email, Facebook, flyers, or drafts.",
    "If unavailable lists a gap (e.g. who hasn’t responded, family view counts, Meta performance), say “I can’t see that yet” and name the right area (Tasks, Approvals, Volunteers).",
    "If a section is empty, say so plainly. Prefer concrete next steps and name real items from the context.",
    "Keep answers to 3–6 short sentences or a tight bullet list. Use short paragraphs or bullets — easy to scan.",
    "Do NOT write markdown links like [Approvals](/approvals). Destinations appear as separate buttons — refer to areas by name only.",
    "You are not drafting social posts or artwork — only operational guidance.",
  ].join("\n");
}

export async function askRalliOpsCoach(input: {
  question: string;
  pathname?: string | null;
  eventId?: string | null;
}): Promise<AskRalliOpsResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      eventOptions: [],
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
      eventOptions: [],
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
    input.eventId,
  );

  if (resolution.kind === "ambiguous") {
    return {
      success: true,
      answer: formatAmbiguousEventAnswer(resolution.candidates),
      links: [],
      eventOptions: toEventOptions(resolution.candidates),
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
      eventOptions: [],
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
        `I found “${resolution.event.title}” (${formatEventDateLabel(resolution.event.date)}), but couldn’t load its operational details just now.`,
        "Open the event page and try Tasks or Approvals, or ask again in a moment.",
      ].join(" "),
      links: [
        {
          label: formatEventChipLabel(
            resolution.event.title,
            resolution.event.date,
          ),
          href: `/events/${resolution.event.id}`,
        },
        { label: "Approvals", href: "/approvals" },
        { label: "Tasks", href: "/tasks" },
      ],
      eventOptions: [],
      source: "ops",
      error: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      success: true,
      answer: formatDeterministicOpsAnswer(pack),
      links: pack.links,
      eventOptions: [],
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
    usage: {
      actionType: "ask_ralli",
      organizationId: membership.organizationId,
      eventId: resolution.event.id,
      feature: "ask_ralli_ops",
    },
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: true,
      answer: formatDeterministicOpsAnswer(pack),
      links: pack.links,
      eventOptions: [],
      source: "ops",
      error: null,
    };
  }

  return {
    success: true,
    answer: result.text.trim(),
    links: pack.links,
    eventOptions: [],
    source: "ops",
    error: null,
  };
}
