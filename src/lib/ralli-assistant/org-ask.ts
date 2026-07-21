import { generateText, isAiConfigured } from "@/lib/ai/provider";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { getActiveMembership } from "@/lib/auth/membership-queries";
import {
  buildOrgBriefingContextPack,
  formatDeterministicOrgBriefingAnswer,
  serializeOrgBriefingForPrompt,
} from "@/lib/ralli-assistant/org-briefing-context";
import { buildOrgBriefingLinks } from "@/lib/ralli-assistant/org-briefing-format";
import type { ProductHelpLink } from "@/lib/ralli-assistant/product-help-knowledge";

export interface AskRalliOrgResult {
  success: boolean;
  answer: string | null;
  links: ProductHelpLink[];
  source: "org";
  error: string | null;
}

function buildOrgSystemPrompt(): string {
  return [
    "You are Ask Ralli AI — an operational coach for Hey Ralli (CampaignOS).",
    "Answer ONLY from the provided ORG BRIEFING CONTEXT JSON. Do not invent approvals, tasks, events, schedules, volunteer counts, or posts.",
    "Use volunteers and communications sections for org-wide staffing and comms gap questions.",
    "If unavailable lists a gap, say “I can’t see that yet” and name Volunteers, Communications Hub, or Campaigns.",
    "If a section is empty, say so plainly. Prefer concrete next steps and name real items from the context.",
    "Keep answers to 3–6 short sentences or a tight bullet list. Use short paragraphs or bullets — easy to scan.",
    "Do NOT write markdown links like [Approvals](/approvals). Destinations appear as separate buttons — refer to areas by name only.",
    "You are briefing a board / chair / ops lead across the organization — not drafting posts or artwork.",
  ].join("\n");
}

export async function askRalliOrgBriefing(input: {
  question: string;
}): Promise<AskRalliOrgResult> {
  const question = input.question.trim();
  if (!question) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "org",
      error: "Ask an organization briefing question.",
    };
  }

  const membership = await getActiveMembership();
  if (!membership) {
    return {
      success: false,
      answer: null,
      links: [],
      source: "org",
      error: "Join or select an organization to ask for a briefing.",
    };
  }

  let pack;
  try {
    pack = await buildOrgBriefingContextPack();
  } catch (error) {
    console.error("Ask Ralli org briefing: failed to build context pack", error);
    return {
      success: true,
      answer: [
        "I couldn’t load your organization briefing just now.",
        "Try Approvals or Today, or ask again in a moment.",
      ].join(" "),
      links: buildOrgBriefingLinks(),
      source: "org",
      error: null,
    };
  }

  if (!isAiConfigured()) {
    return {
      success: true,
      answer: formatDeterministicOrgBriefingAnswer(pack),
      links: pack.links,
      source: "org",
      error: null,
    };
  }

  const result = await generateText({
    systemPrompt: buildOrgSystemPrompt(),
    userPrompt: [
      `User question: ${question}`,
      "",
      "ORG BRIEFING CONTEXT (authoritative — answer only from this):",
      serializeOrgBriefingForPrompt(pack),
    ].join("\n"),
    maxTokens: 400,
    temperature: 0.2,
    model: resolveFastDraftModel(),
  });

  if (!result.success || !result.text?.trim()) {
    return {
      success: true,
      answer: formatDeterministicOrgBriefingAnswer(pack),
      links: pack.links,
      source: "org",
      error: null,
    };
  }

  return {
    success: true,
    answer: result.text.trim(),
    links: pack.links,
    source: "org",
    error: null,
  };
}
