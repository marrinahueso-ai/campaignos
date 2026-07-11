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
import {
  buildAcknowledgementDraft,
  buildFollowUpDraft,
  humanizeInboxDraft,
} from "@/lib/inbox/ai/draft-templates";
import { messageNeedsSourceAnswer } from "@/lib/inbox/ai/message-intent";
import { INBOX_CHANNEL_LABELS } from "@/lib/inbox/constants";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import {
  loadOrderedInboxAiSourcesForOrganization,
  type OrderedInboxAiSource,
} from "@/lib/organizations/inbox-ai-sources/queries";
import { getOrganizationById } from "@/lib/organizations/queries";
import type { InboxAiSourceUsed } from "@/types/inbox-ai-sources";
import { createClient } from "@/lib/supabase/server";
import { getInboxMessagesForThread } from "@/lib/inbox/message-queries";

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

function formatConfiguredSourcesCatalog(sources: OrderedInboxAiSource[]): string {
  if (sources.length === 0) {
    return "No inbox AI sources configured for this organization.";
  }

  return sources
    .map((source, index) => {
      const description = source.description?.trim() || "(no description)";
      return `${index + 1}. ${source.label}
   Description: ${description}
   URL: ${source.url}`;
    })
    .join("\n");
}

function formatSourceContext(
  sourceUsed: InboxAiSourceUsed,
  configuredSources: OrderedInboxAiSource[],
): string {
  const catalog = formatConfiguredSourcesCatalog(configuredSources);

  if (sourceUsed.answerFrom) {
    return `Configured inbox AI sources:
${catalog}

Matched source: ${sourceUsed.answerFrom.label}
Source URL: ${sourceUsed.answerFrom.url}
Source details (use ONLY this for factual claims — do NOT invent steps or account details):
${sourceUsed.answerFrom.excerpt}

Weave the source link in naturally ONLY when the parent is asking for that information (e.g. "SACC is our after-school program — here's the page with all the details: ${sourceUsed.answerFrom.url}").`;
  }

  return `Configured inbox AI sources:
${catalog}

Matched source: none — no configured source matched this question.
Draft a brief, casual reply saying you're checking on it and will follow up soon. Do NOT invent dates, times, locations, prices, deadlines, or policies. Do NOT include links unless one of the configured sources clearly applies.`;
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
- Include the source page link ONLY when the parent is asking for that information — never add links to compliments or thank-yous.
- Do NOT mention unrelated PTO events or generic website invitations.
- Do NOT pivot to a matched source when the message is praise, thanks, or social chatter.

Return ONLY the reply text — no quotes, labels, or markdown.`;
}

function formatThreadConversation(input: {
  messages: InboxMessage[];
  inboundMessageId: string;
  maxMessages?: number;
}): string {
  const maxMessages = input.maxMessages ?? 6;
  const recentMessages = input.messages.slice(-maxMessages);

  if (recentMessages.length === 0) {
    return "(No prior thread messages)";
  }

  return recentMessages
    .map((message) => {
      const prefix = message.senderName?.trim() ? `${message.senderName.trim()}: ` : "";
      const marker = message.id === input.inboundMessageId ? " [reply target]" : "";
      return `${prefix}${message.body.trim()}${marker}`;
    })
    .join("\n");
}

function buildVerifiedAnswerUserPrompt(input: {
  thread: InboxThread;
  inboundMessage: InboxMessage;
  threadConversation: string;
  voiceBlock: string;
  sourceBlock: string;
  configuredSourcesCatalog: string;
}): string {
  const channelLabel = INBOX_CHANNEL_LABELS[input.thread.channelType];

  return `Channel: ${channelLabel}
${input.thread.subject ? `Context: ${input.thread.subject}` : ""}

Inbox thread (comments/messages):
${input.threadConversation}

Message to reply to:
${input.inboundMessage.senderName
    ? `${input.inboundMessage.senderName}: ${input.inboundMessage.body}`
    : input.inboundMessage.body}

ORGANIZATION INBOX AI SOURCES (from settings — name, description, URL):
${input.configuredSourcesCatalog}

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

async function generateSourceAwareDraft(input: {
  organizationId: string;
  thread: InboxThread;
  inboundMessage: InboxMessage;
  orderedSources: OrderedInboxAiSource[];
  organization: Awaited<ReturnType<typeof getOrganizationById>>;
}): Promise<{
  success: boolean;
  draftBody: string | null;
  aiSourceUsed: InboxAiSourceUsed | null;
  error: string | null;
}> {
  const sourceUsed = await checkOrganizationSources({
    question: input.inboundMessage.body,
    sources: input.orderedSources,
  });

  const threadMessages = await getInboxMessagesForThread({
    organizationId: input.organizationId,
    threadId: input.thread.id,
  });
  const threadConversation = formatThreadConversation({
    messages: threadMessages,
    inboundMessageId: input.inboundMessage.id,
  });

  const profile = input.organization
    ? await getAiProfileByOrganizationId(input.organization.id)
    : null;
  const orgFacts = buildOrganizationGroundingFacts({
    organization: input.organization,
    profile,
  });
  const voiceBlock = formatVoiceBlock({ organization: orgFacts });
  const configuredSourcesCatalog = formatConfiguredSourcesCatalog(input.orderedSources);
  const sourceBlock = formatSourceContext(sourceUsed, input.orderedSources);

  const generation = await generateText({
    systemPrompt: buildVerifiedAnswerSystemPrompt(),
    userPrompt: buildVerifiedAnswerUserPrompt({
      thread: input.thread,
      inboundMessage: input.inboundMessage,
      threadConversation,
      voiceBlock,
      sourceBlock,
      configuredSourcesCatalog,
    }),
    model: resolveFastDraftModel(),
    maxTokens: 300,
    temperature: 0.35,
  });

  if (!generation.success || !generation.text?.trim()) {
    if (sourceUsed.noAnswerFound) {
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

export async function generateInboxReplyWithSources(input: {
  organizationId: string;
  thread: InboxThread;
  inboundMessage: InboxMessage;
  forceRegenerate?: boolean;
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

  const [organization, orderedSources] = await Promise.all([
    getOrganizationById(input.organizationId),
    loadOrderedInboxAiSourcesForOrganization(input.organizationId),
  ]);

  const needsSourceAnswer = messageNeedsSourceAnswer(input.inboundMessage.body);

  if (!needsSourceAnswer) {
    const draftBody = buildAcknowledgementDraft({
      messageBody: input.inboundMessage.body,
      senderName: input.inboundMessage.senderName,
      channelType: input.thread.channelType,
    });
    const sourceUsed: InboxAiSourceUsed = {
      sourcesChecked: orderedSources.map((source) => ({
        label: source.label.trim() || source.label,
        url: source.url,
        sourceType: source.sourceType,
        checked: false,
        answerFound: false,
      })),
      answerFrom: null,
      noAnswerFound: orderedSources.length === 0,
    };

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

  return generateSourceAwareDraft({
    organizationId: input.organizationId,
    thread: input.thread,
    inboundMessage: input.inboundMessage,
    orderedSources,
    organization,
  });
}
