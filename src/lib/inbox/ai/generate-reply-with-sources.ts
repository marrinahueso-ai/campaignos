import "server-only";

import { generateText, isAiConfigured } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import {
  buildOrganizationGroundingFacts,
} from "@/lib/ai-grounding/organization-facts";
import type {
  OrganizationGroundingFacts,
} from "@/lib/ai-grounding/types";
import { checkOrganizationSources } from "@/lib/inbox/ai/check-organization-sources";
import { buildFollowUpDraft, humanizeInboxDraft } from "@/lib/inbox/ai/draft-templates";
import { INBOX_CHANNEL_LABELS } from "@/lib/inbox/constants";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import {
  buildOrderedInboxAiSources,
  getCustomInboxAiSources,
} from "@/lib/organizations/inbox-ai-sources/queries";
import { getOrganizationById } from "@/lib/organizations/queries";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";
import { createClient } from "@/lib/supabase/server";

function channelReplyGuidance(channelType: InboxChannelType): string {
  switch (channelType) {
    case "instagram_dm":
    case "facebook_message":
      return "Reply like a friendly PTO parent in a DM — warm, casual, 1–3 short sentences. No emojis.";
    case "instagram_comment":
    case "facebook_comment":
      return "Reply like a friendly PTO parent in a public comment — warm and brief, 1–2 sentences. No emojis.";
    default:
      return "Reply like a friendly PTO parent helping another parent — warm, casual, and concise. No emojis.";
  }
}

function formatVoiceBlock(input: {
  organization: OrganizationGroundingFacts;
}): string {
  const lines = [
    input.organization.name ? `- Organization: ${input.organization.name}` : null,
    input.organization.organizationVoice
      ? `- Organization voice: ${input.organization.organizationVoice}`
      : null,
    input.organization.writingStyle
      ? `- Writing style: ${input.organization.writingStyle}`
      : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "- (No voice profile on file)";
}

function formatSourceContext(sourceUsed: InboxAiSourceUsed): string {
  if (sourceUsed.answerFrom) {
    return `Matched source: ${sourceUsed.answerFrom.label}
Source URL: ${sourceUsed.answerFrom.url}
Source details (use ONLY this for factual claims — do NOT invent steps or account details):
${sourceUsed.answerFrom.excerpt}

Weave the source link in naturally (e.g. "SACC is our after-school program — here's the page with all the details: ${sourceUsed.answerFrom.url}").`;
  }

  return `Matched source: none — no configured source matched this question.
Draft a brief, casual reply saying you're checking on it and will follow up soon. Do NOT invent dates, times, locations, prices, deadlines, or policies.`;
}

const INBOX_GROUNDING_RULES = [
  "Use ONLY verified facts from SOURCE CHECK RESULTS — never invent dates, times, locations, prices, deadlines, or policies.",
  "When information is missing from the source, say you are checking — do not guess.",
].join(" ");

function buildVerifiedAnswerSystemPrompt(): string {
  return `${INBOX_GROUNDING_RULES}

You draft replies for a school PTO social inbox — like a friendly parent volunteer answering messages, NOT a school office, district admin, or marketing team.

VOICE & TONE (this overrides any formal org voice notes):
- Warm, casual, and helpful — like a volunteer mom texting another parent.
- Use plain language and short sentences. Contractions are fine (we're, here's, you'll).
- Sound conversational but still clear and useful.
- No emojis.
- NEVER use corporate or stiff phrases like "For information about...", "you can check out...", "Please visit this link", or "Visit our website".
- Weave links in naturally — not as formal citations.

GOOD EXAMPLES (match this tone):
- "Hey! SACC is our after-school care program — here's the page with signup info: https://example.com/sacc"
- "Good question! Lunch money goes through School Bucks — here's how it works: https://example.com/lunch"

BAD EXAMPLES (never write like this):
- "For information about SACC, please visit our website at https://example.com/sacc."
- "You can find details about after-school care by checking out this link: https://example.com/sacc"

STRICT INBOX RULES:
- Use ONLY the matched source details in SOURCE CHECK RESULTS for factual claims.
- Include the source page link when helpful.
- Do NOT mention unrelated PTO events or generic website invitations.

Return ONLY the reply text — no quotes, labels, or markdown.`;
}

function buildVerifiedAnswerUserPrompt(input: {
  thread: InboxThread;
  inboundMessage: InboxMessage;
  voiceBlock: string;
  sourceBlock: string;
}): string {
  const channelLabel = INBOX_CHANNEL_LABELS[input.thread.channelType];
  const conversationLines = [
    input.inboundMessage.senderName
      ? `${input.inboundMessage.senderName}: ${input.inboundMessage.body}`
      : input.inboundMessage.body,
  ];

  return `Channel: ${channelLabel}
${input.thread.subject ? `Context: ${input.thread.subject}` : ""}

Recent message to reply to:
${conversationLines.join("\n")}

SOURCE CHECK RESULTS (authoritative — use ONLY this for facts):
${input.sourceBlock}

Voice/style (background only — inbox replies stay casual even if org voice is formal):
${input.voiceBlock}

${channelReplyGuidance(input.thread.channelType)}`;
}

async function saveInboxDraft(input: {
  organizationId: string;
  messageId: string;
  draftBody: string;
  sourceUsed: InboxAiSourceUsed;
}): Promise<{ success: boolean; error: string | null }> {
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inbox_messages")
    .update({
      ai_draft_body: input.draftBody,
      ai_draft_generated_at: now,
      ai_source_used: input.sourceUsed,
      approved_body: null,
      approved_at: null,
      approved_by_user_id: null,
      status: "pending",
      updated_at: now,
    })
    .eq("id", input.messageId)
    .eq("organization_id", input.organizationId);

  if (error) {
    return { success: false, error: "Draft was generated but could not be saved." };
  }

  return { success: true, error: null };
}

export async function generateInboxReplyWithSources(input: {
  organizationId: string;
  thread: InboxThread;
  inboundMessage: InboxMessage;
}): Promise<{
  success: boolean;
  draftBody: string | null;
  aiSourceUsed: InboxAiSourceUsed | null;
  error: string | null;
}> {
  if (!isAiConfigured()) {
    return {
      success: false,
      draftBody: null,
      aiSourceUsed: null,
      error: "AI drafting is not configured.",
    };
  }

  const [organization, customSources] = await Promise.all([
    getOrganizationById(input.organizationId),
    getCustomInboxAiSources(input.organizationId),
  ]);

  const orderedSources = buildOrderedInboxAiSources({ customSources });

  const sourceUsed = await checkOrganizationSources({
    question: input.inboundMessage.body,
    sources: orderedSources,
  });

  if (sourceUsed.noAnswerFound) {
    const profile = organization
      ? await getAiProfileByOrganizationId(organization.id)
      : null;
    const orgFacts = buildOrganizationGroundingFacts({ organization, profile });

    const draftBody = buildFollowUpDraft({
      senderName: input.inboundMessage.senderName,
      organizationName: orgFacts.name,
      channelType: input.thread.channelType,
    });

    const saved = await saveInboxDraft({
      organizationId: input.organizationId,
      messageId: input.inboundMessage.id,
      draftBody,
      sourceUsed,
    });

    if (!saved.success) {
      return {
        success: false,
        draftBody: null,
        aiSourceUsed: sourceUsed,
        error: saved.error,
      };
    }

    return { success: true, draftBody, aiSourceUsed: sourceUsed, error: null };
  }

  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;
  const orgFacts = buildOrganizationGroundingFacts({ organization, profile });
  const voiceBlock = formatVoiceBlock({ organization: orgFacts });
  const sourceBlock = formatSourceContext(sourceUsed);

  const generation = await generateText({
    systemPrompt: buildVerifiedAnswerSystemPrompt(),
    userPrompt: buildVerifiedAnswerUserPrompt({
      thread: input.thread,
      inboundMessage: input.inboundMessage,
      voiceBlock,
      sourceBlock,
    }),
    model: resolveFastDraftModel(),
    maxTokens: 300,
    temperature: 0.35,
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      draftBody: null,
      aiSourceUsed: sourceUsed,
      error: generation.error ?? "Could not generate a draft reply.",
    };
  }

  const draftBody = humanizeInboxDraft(generation.text);
  const saved = await saveInboxDraft({
    organizationId: input.organizationId,
    messageId: input.inboundMessage.id,
    draftBody,
    sourceUsed,
  });

  if (!saved.success) {
    return {
      success: false,
      draftBody: null,
      aiSourceUsed: sourceUsed,
      error: saved.error,
    };
  }

  return { success: true, draftBody, aiSourceUsed: sourceUsed, error: null };
}
