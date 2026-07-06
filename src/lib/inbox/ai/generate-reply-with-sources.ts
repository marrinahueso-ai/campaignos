import "server-only";

import { generateText, isAiConfigured } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { GROUNDING_SYSTEM_RULES } from "@/lib/ai-grounding";
import {
  buildOrganizationGroundingFacts,
} from "@/lib/ai-grounding/organization-facts";
import type {
  OrganizationGroundingFacts,
} from "@/lib/ai-grounding/types";
import { checkOrganizationSources } from "@/lib/inbox/ai/check-organization-sources";
import { buildFollowUpDraft } from "@/lib/inbox/ai/draft-templates";
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
      return "Write a warm, concise direct message reply (1–3 short sentences).";
    case "instagram_comment":
    case "facebook_comment":
      return "Write a friendly public comment reply (1–2 sentences).";
    default:
      return "Write a helpful, concise reply.";
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

Include the source link in the reply.`;
  }

  return `Matched source: none — no configured source matched this question.
Draft a brief reply saying the team is checking and will follow up soon. Do NOT invent dates, times, locations, prices, deadlines, or policies.`;
}

function buildVerifiedAnswerSystemPrompt(): string {
  return `${GROUNDING_SYSTEM_RULES}

You draft replies for a school PTO social inbox.

STRICT INBOX RULES:
- Use ONLY the matched source details in SOURCE CHECK RESULTS for factual claims.
- NEVER invent dates, times, locations, prices, deadlines, or policies beyond what the source provides.
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

Voice/style (tone only — not a source of facts):
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
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      draftBody: null,
      aiSourceUsed: sourceUsed,
      error: generation.error ?? "Could not generate a draft reply.",
    };
  }

  const draftBody = generation.text.trim();
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
