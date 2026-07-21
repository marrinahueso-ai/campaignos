/**
 * Ask Ralli Phase 4 — content draft helper.
 * Reuses meta-caption / grounding prompt builders; never publishes or emails.
 */

import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  buildGroundingContext,
  formatGroundingContextForPrompt,
  GROUNDING_SYSTEM_RULES,
} from "@/lib/ai-grounding";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import { campaignBuilderHref } from "@/lib/campaign-builder-v2/navigation";
import { loadCampaignBuilderSession } from "@/lib/campaign-builder-v2/session-queries";
import type { CampaignBuilderSession } from "@/lib/campaign-builder-v2/types";
import { getActiveEvents } from "@/lib/events/queries";
import {
  META_CAPTION_FEED_MAX_TOKENS,
  resolveMetaCaptionModel,
} from "@/lib/meta-captions/constants";
import { buildMetaCaptionFactsBlock } from "@/lib/meta-captions/facts";
import {
  buildMetaCaptionSystemPrompt,
  buildMetaCaptionUserPrompt,
} from "@/lib/meta-captions/prompts";
import { getMetaSocialCaptionsForEvent } from "@/lib/meta-captions/queries";
import type {
  MetaCaptionLength,
  MetaCaptionTone,
} from "@/lib/meta-captions/types";
import {
  formatAmbiguousEventAnswer,
  formatNoEventAnswer,
  resolveEventFromQuestion,
  type ResolvableEvent,
} from "@/lib/ralli-assistant/event-resolver";
import {
  detectContentActionKind,
  detectContentLengthHint,
  detectContentToneHint,
  extractPastedDraftText,
  type ContentActionKind,
  type ContentLengthHint,
  type ContentToneHint,
} from "@/lib/ralli-assistant/content-intent";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export interface AskRalliContentResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: "content";
  error: string | null;
}

const DRAFT_DISCLAIMER =
  "This is draft text only — nothing was published or emailed.";

function toneToMeta(tone: ContentToneHint): MetaCaptionTone | undefined {
  if (tone === "professional") return "Professional";
  if (tone === "exciting") return "Enthusiastic";
  if (tone === "concise") return "Concise";
  return undefined;
}

function lengthToMeta(length: ContentLengthHint): MetaCaptionLength | undefined {
  if (length === "short") return "Short";
  if (length === "long") return "Long";
  return undefined;
}

function revisionInstructionsFromQuestion(
  question: string,
  kind: ContentActionKind,
  tone: ContentToneHint,
  length: ContentLengthHint,
): string {
  const parts: string[] = [];
  if (kind === "improve_flyer") {
    parts.push("Improve this flyer / announcement copy for school families.");
  } else if (kind === "another_version") {
    parts.push("Write a fresh alternate version with different wording.");
  } else {
    parts.push("Revise the draft per the user's request.");
  }
  if (tone === "professional") parts.push("Tone: more professional.");
  if (tone === "exciting") parts.push("Tone: more exciting and enthusiastic.");
  if (tone === "concise" || length === "short") parts.push("Make it shorter.");
  if (length === "long") parts.push("Allow a bit more detail.");
  const trimmed = question.trim();
  if (trimmed) parts.push(`User request: ${trimmed}`);
  return parts.join(" ");
}

function contentLinks(eventId?: string | null): ProductHelpLink[] {
  const links: ProductHelpLink[] = [];
  if (eventId) {
    links.push({
      label: "Create with AI",
      href: campaignBuilderHref(eventId, "preview"),
    });
    links.push({
      label: "Event Preview",
      href: `/events/${eventId}`,
    });
  }
  links.push({ label: "Communications Hub", href: "/communications" });
  if (!eventId) {
    links.push({ label: "Campaigns", href: "/events" });
  }
  return links;
}

function formatDraftAnswer(input: {
  intro: string;
  draft: string;
  eventTitle?: string | null;
}): string {
  const lines = [
    input.intro,
    input.eventTitle ? `Grounded in: ${input.eventTitle}.` : null,
    "",
    "--- Draft ---",
    input.draft.trim(),
    "---",
    "",
    DRAFT_DISCLAIMER,
    "Open Create with AI or Communications to apply or send it yourself.",
  ].filter((line) => line != null);

  return lines.join("\n");
}

function normalizeDraft(text: string): string {
  return text
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^(caption|draft):\s*/i, "")
    .trim();
}

function latestCaptionFromSession(
  session: CampaignBuilderSession | null,
): { text: string; milestoneName: string } | null {
  if (!session) return null;

  const selectedId = session.selectedMilestoneId;
  const ordered = [...session.previewContents].reverse();

  const prefer = selectedId
    ? ordered.filter((preview) => preview.milestoneId === selectedId)
    : ordered;

  for (const preview of prefer.length > 0 ? prefer : ordered) {
    for (const caption of preview.captions) {
      const text = caption.text?.trim();
      if (text) {
        const milestone =
          session.milestones.find((item) => item.id === preview.milestoneId)
            ?.name ?? "Campaign milestone";
        return { text, milestoneName: milestone };
      }
    }
  }

  return null;
}

async function loadLatestEventDraft(eventId: string): Promise<{
  text: string;
  label: string;
} | null> {
  try {
    const session = await loadCampaignBuilderSession(eventId);
    const fromSession = latestCaptionFromSession(session);
    if (fromSession) {
      return {
        text: fromSession.text,
        label: fromSession.milestoneName,
      };
    }
  } catch (error) {
    console.error("Ask Ralli content: session caption load failed", error);
  }

  try {
    const captions = await getMetaSocialCaptionsForEvent(eventId);
    const feed = [...captions]
      .filter((entry) => entry.placement === "feed" && entry.content.trim())
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const latest = feed[0];
    if (latest) {
      return {
        text: latest.content.trim(),
        label: latest.milestoneTitle || "Social caption",
      };
    }
  } catch (error) {
    console.error("Ask Ralli content: meta caption load failed", error);
  }

  return null;
}

async function generateRewriteDraft(input: {
  question: string;
  kind: ContentActionKind;
  draftText: string;
  eventId?: string | null;
  milestoneTitle?: string | null;
  tone: ContentToneHint;
  length: ContentLengthHint;
}): Promise<{ success: boolean; text: string | null; error: string | null }> {
  const tone = toneToMeta(input.tone);
  const length = lengthToMeta(input.length);
  const revision = revisionInstructionsFromQuestion(
    input.question,
    input.kind,
    input.tone,
    input.length,
  );

  let factsBlock =
    "Use only details present in the draft below. Do not invent dates, times, locations, or volunteer needs.";

  if (input.eventId) {
    const eventFacts = await buildMetaCaptionFactsBlock({
      eventId: input.eventId,
      relativeDay: -1,
      milestoneTitle: input.milestoneTitle ?? "Reminder",
    });
    if (eventFacts) {
      factsBlock = eventFacts;
    }
  }

  const userPrompt = [
    buildMetaCaptionUserPrompt({
      placement: "feed",
      milestoneTitle: input.milestoneTitle ?? "Campaign update",
      relativeDay: -1,
      eventDate: null,
      factsBlock,
      revisionContext: input.draftText,
      tone,
      length,
    }),
    "",
    `Additional revision instructions: ${revision}`,
  ].join("\n");

  const generation = await generateText({
    systemPrompt: buildMetaCaptionSystemPrompt(),
    userPrompt,
    model: resolveMetaCaptionModel(),
    maxTokens: META_CAPTION_FEED_MAX_TOKENS,
    temperature: 0.5,
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      text: null,
      error: generation.error ?? "Could not rewrite that draft just now.",
    };
  }

  return {
    success: true,
    text: normalizeDraft(generation.text),
    error: null,
  };
}

async function generateReminderDraft(input: {
  question: string;
  kind: "write_reminder" | "write_volunteer_reminder";
  event: ResolvableEvent;
}): Promise<{ success: boolean; text: string | null; error: string | null }> {
  const grounding = await buildGroundingContext({
    eventId: input.event.id,
    channel:
      input.kind === "write_volunteer_reminder" ? "email" : "facebook",
  });
  const factsBlock =
    grounding != null
      ? formatGroundingContextForPrompt(grounding)
      : ((await buildMetaCaptionFactsBlock({
          eventId: input.event.id,
          relativeDay: -1,
          milestoneTitle:
            input.kind === "write_volunteer_reminder"
              ? "Volunteer reminder"
              : "Tomorrow reminder",
        })) ??
        `Event: ${input.event.title}\nDate: ${input.event.date}`);

  const isVolunteer = input.kind === "write_volunteer_reminder";
  const systemPrompt = [
    "You write short draft messages for school PTO campaigns.",
    ...GROUNDING_SYSTEM_RULES,
    "Return draft message body only — no preamble, labels, or markdown fences.",
    "Never claim the message was sent, published, or emailed.",
    isVolunteer
      ? "Write a warm volunteer signup reminder email body (2–5 short sentences)."
      : "Write a warm family-facing reminder for tomorrow / upcoming event day (2–4 short sentences).",
  ].join("\n");

  const userPrompt = [
    `User request: ${input.question}`,
    `Event title: ${input.event.title}`,
    `Event date: ${input.event.date}`,
    "",
    "Verified event facts (use only these):",
    factsBlock,
  ].join("\n");

  const generation = await generateText({
    systemPrompt,
    userPrompt,
    model: resolveFastDraftModel(),
    maxTokens: 350,
    temperature: 0.45,
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      text: null,
      error: generation.error ?? "Could not draft that reminder just now.",
    };
  }

  return {
    success: true,
    text: normalizeDraft(generation.text),
    error: null,
  };
}

async function generateFreshCaptionDraft(input: {
  question: string;
  event: ResolvableEvent;
  kind: ContentActionKind;
  tone: ContentToneHint;
  length: ContentLengthHint;
}): Promise<{ success: boolean; text: string | null; error: string | null }> {
  const factsBlock =
    (await buildMetaCaptionFactsBlock({
      eventId: input.event.id,
      relativeDay: -7,
      milestoneTitle:
        input.kind === "improve_flyer" ? "Flyer / announcement" : "Campaign update",
    })) ?? `Event: ${input.event.title}\nDate: ${input.event.date}`;

  const userPrompt = buildMetaCaptionUserPrompt({
    placement: "feed",
    milestoneTitle:
      input.kind === "improve_flyer" ? "Flyer / announcement" : "Campaign update",
    relativeDay: -7,
    eventDate: input.event.date,
    factsBlock,
    tone: toneToMeta(input.tone),
    length: lengthToMeta(input.length),
    feedCtaGuide:
      input.kind === "improve_flyer"
        ? "Write flyer-style announcement copy suitable for a school graphic caption."
        : undefined,
  });

  const generation = await generateText({
    systemPrompt: buildMetaCaptionSystemPrompt(),
    userPrompt: `${userPrompt}\n\nUser request: ${input.question}`,
    model: resolveMetaCaptionModel(),
    maxTokens: META_CAPTION_FEED_MAX_TOKENS,
    temperature: 0.55,
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      text: null,
      error: generation.error ?? "Could not generate a draft just now.",
    };
  }

  return {
    success: true,
    text: normalizeDraft(generation.text),
    error: null,
  };
}

function aiNotConfiguredAnswer(eventId?: string | null): AskRalliContentResult {
  return {
    success: true,
    answer: [
      "I can draft reminders and rewrite captions when OpenAI is configured for this environment.",
      "Set OPENAI_API_KEY (or use Create with AI on an event, which uses the same AI setup).",
      DRAFT_DISCLAIMER,
    ].join(" "),
    links: contentLinks(eventId),
    source: "content",
    error: null,
  };
}

export async function askRalliContentCoach(input: {
  question: string;
  pathname?: string | null;
}): Promise<AskRalliContentResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "content",
      error: "Ask me to write or rewrite a draft (for example, “Write tomorrow’s reminder”).",
    };
  }

  const kind = detectContentActionKind(question);
  const tone = detectContentToneHint(question);
  const length = detectContentLengthHint(question);
  const pasted = extractPastedDraftText(question);

  const membership = await getActiveMembership();
  if (!membership) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "content",
      error: "Join or select an organization to draft campaign content.",
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
    console.error("Ask Ralli content: failed to load events", error);
    events = [];
  }

  const needsEvent =
    kind === "write_reminder" ||
    kind === "write_volunteer_reminder" ||
    !pasted;

  let event: ResolvableEvent | null = null;
  if (needsEvent || events.length > 0) {
    const resolution = resolveEventFromQuestion(
      question,
      events,
      input.pathname,
    );

    if (resolution.kind === "ambiguous") {
      return {
        success: true,
        answer: formatAmbiguousEventAnswer(resolution.candidates),
        links: resolution.candidates.slice(0, 3).map((item) => ({
          label: item.title,
          href: `/events/${item.id}`,
        })),
        source: "content",
        error: null,
      };
    }

    if (resolution.kind === "matched") {
      event = resolution.event;
    } else if (
      kind === "write_reminder" ||
      kind === "write_volunteer_reminder"
    ) {
      return {
        success: true,
        answer: [
          formatNoEventAnswer(resolution.reason),
          "Name the event (or open its page), then ask again — for example, “Write tomorrow’s reminder for Back to School Fair.”",
        ].join(" "),
        links: contentLinks(null),
        source: "content",
        error: null,
      };
    }
  }

  if (!isAiConfigured()) {
    return aiNotConfiguredAnswer(event?.id ?? null);
  }

  // Rewrite / improve / another version with pasted text (event optional).
  if (
    pasted &&
    (kind === "rewrite" ||
      kind === "improve_flyer" ||
      kind === "another_version")
  ) {
    const rewritten = await generateRewriteDraft({
      question,
      kind,
      draftText: pasted,
      eventId: event?.id ?? null,
      milestoneTitle: null,
      tone,
      length,
    });

    if (!rewritten.success || !rewritten.text) {
      return {
        success: false,
        answer: null,
        links: contentLinks(event?.id ?? null),
        source: "content",
        error: rewritten.error ?? "Could not rewrite that draft.",
      };
    }

    return {
      success: true,
      answer: formatDraftAnswer({
        intro: "Here’s a revised draft from the text you shared:",
        draft: rewritten.text,
        eventTitle: event?.title ?? null,
      }),
      links: contentLinks(event?.id ?? null),
      source: "content",
      error: null,
    };
  }

  if (kind === "write_reminder" || kind === "write_volunteer_reminder") {
    if (!event) {
      return {
        success: true,
        answer:
          "Name an event or open an event page, then ask me to write the reminder.",
        links: contentLinks(null),
        source: "content",
        error: null,
      };
    }

    const draft = await generateReminderDraft({
      question,
      kind,
      event,
    });

    if (!draft.success || !draft.text) {
      return {
        success: false,
        answer: null,
        links: contentLinks(event.id),
        source: "content",
        error: draft.error,
      };
    }

    return {
      success: true,
      answer: formatDraftAnswer({
        intro:
          kind === "write_volunteer_reminder"
            ? "Here’s a volunteer reminder draft:"
            : "Here’s a reminder draft for tomorrow / upcoming messaging:",
        draft: draft.text,
        eventTitle: event.title,
      }),
      links: contentLinks(event.id),
      source: "content",
      error: null,
    };
  }

  // Rewrite / improve / another version — pull latest caption when on an event.
  if (event) {
    const existing = await loadLatestEventDraft(event.id);

    if (existing) {
      const rewritten = await generateRewriteDraft({
        question,
        kind,
        draftText: existing.text,
        eventId: event.id,
        milestoneTitle: existing.label,
        tone,
        length,
      });

      if (!rewritten.success || !rewritten.text) {
        return {
          success: false,
          answer: null,
          links: contentLinks(event.id),
          source: "content",
          error: rewritten.error,
        };
      }

      return {
        success: true,
        answer: formatDraftAnswer({
          intro: `Here’s a revised draft based on your latest “${existing.label}” caption:`,
          draft: rewritten.text,
          eventTitle: event.title,
        }),
        links: contentLinks(event.id),
        source: "content",
        error: null,
      };
    }

    if (kind === "another_version" || kind === "improve_flyer") {
      const fresh = await generateFreshCaptionDraft({
        question,
        event,
        kind,
        tone,
        length,
      });

      if (!fresh.success || !fresh.text) {
        return {
          success: false,
          answer: null,
          links: contentLinks(event.id),
          source: "content",
          error: fresh.error,
        };
      }

      return {
        success: true,
        answer: formatDraftAnswer({
          intro:
            kind === "improve_flyer"
              ? "Here’s a flyer-style draft grounded in this event:"
              : "Here’s another caption version grounded in this event:",
          draft: fresh.text,
          eventTitle: event.title,
        }),
        links: contentLinks(event.id),
        source: "content",
        error: null,
      };
    }

    return {
      success: true,
      answer: [
        `I couldn’t find an existing caption or reminder draft for ${event.title}.`,
        "Paste the text to rewrite (in quotes), or generate a first draft in Create with AI → Preview, then ask again.",
        DRAFT_DISCLAIMER,
      ].join(" "),
      links: contentLinks(event.id),
      source: "content",
      error: null,
    };
  }

  return {
    success: true,
    answer: [
      "Paste the caption or flyer text to rewrite (in quotes), or open an event page / name the event so I can use its latest draft.",
      "Examples: Make this shorter: \"…\", or Write tomorrow’s reminder for Back to School Fair.",
      DRAFT_DISCLAIMER,
    ].join(" "),
    links: contentLinks(null),
    source: "content",
    error: null,
  };
}
