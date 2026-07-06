import "server-only";

import { generateText, isAiConfigured } from "@/lib/ai";
import { resolveFastDraftModel } from "@/lib/ai/models";
import { GROUNDING_SYSTEM_RULES } from "@/lib/ai-grounding";
import {
  buildOrganizationGroundingFacts,
  buildSchoolSetupGroundingFacts,
} from "@/lib/ai-grounding/organization-facts";
import type {
  OrganizationGroundingFacts,
  SchoolSetupGroundingFacts,
} from "@/lib/ai-grounding/types";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { getUpcomingEvents } from "@/lib/events/queries";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";
import type { InboxChannelType, InboxMessage, InboxThread } from "@/lib/inbox/types";
import { INBOX_CHANNEL_LABELS } from "@/lib/inbox/constants";
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

function formatOrganizationBlock(input: {
  organization: OrganizationGroundingFacts;
  schoolSetup: SchoolSetupGroundingFacts;
}): string {
  const lines = [
    input.organization.name ? `- School / organization: ${input.organization.name}` : null,
    input.organization.district ? `- District: ${input.organization.district}` : null,
    input.organization.ptoWebsite ? `- PTO website: ${input.organization.ptoWebsite}` : null,
    input.organization.schoolWebsite
      ? `- School website: ${input.organization.schoolWebsite}`
      : null,
    input.organization.organizationVoice
      ? `- Organization voice: ${input.organization.organizationVoice}`
      : null,
    input.organization.writingStyle
      ? `- Writing style: ${input.organization.writingStyle}`
      : null,
    input.organization.communicationPreferences
      ? `- Communication preferences: ${input.organization.communicationPreferences}`
      : null,
  ].filter(Boolean);

  return lines.length > 0 ? lines.join("\n") : "- (No organization profile on file)";
}

function formatEventContext(
  events: Awaited<ReturnType<typeof getUpcomingEvents>>,
): string {
  if (events.length === 0) {
    return "No upcoming events on file.";
  }

  return events
    .slice(0, 5)
    .map((event) => {
      const parts = [`- ${event.title}`];
      if (event.date) {
        parts.push(`on ${event.date}`);
      }
      if (event.time) {
        parts.push(`at ${event.time}`);
      }
      if (event.location) {
        parts.push(`(${event.location})`);
      }
      return parts.join(" ");
    })
    .join("\n");
}

function buildInboxDraftSystemPrompt(): string {
  return `${GROUNDING_SYSTEM_RULES}

You draft replies for a school PTO social inbox. Use only verified organization and event facts provided. If you cannot answer from facts, give a helpful generic PTO response and invite the person to email or visit the PTO website — do not invent dates, times, or policies.

Return ONLY the reply text — no quotes, labels, or markdown.`;
}

function buildInboxDraftUserPrompt(input: {
  thread: InboxThread;
  inboundMessage: InboxMessage;
  organizationBlock: string;
  eventsBlock: string;
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

Organization context:
${input.organizationBlock}

Upcoming events (use only if relevant to the question):
${input.eventsBlock}

${channelReplyGuidance(input.thread.channelType)}`;
}

export async function generateInboxAiDraft(input: {
  organizationId: string;
  thread: InboxThread;
  inboundMessage: InboxMessage;
}): Promise<{ success: boolean; draftBody: string | null; error: string | null }> {
  if (!isAiConfigured()) {
    return {
      success: false,
      draftBody: null,
      error: "AI drafting is not configured.",
    };
  }

  const [organization, schoolProfile, upcomingEvents] = await Promise.all([
    getLatestOrganization(),
    getSchoolProfile(),
    getUpcomingEvents(5, input.organizationId),
  ]);

  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;

  const orgFacts = buildOrganizationGroundingFacts({ organization, profile });
  const schoolFacts = buildSchoolSetupGroundingFacts(schoolProfile);
  const organizationBlock = formatOrganizationBlock({
    organization: orgFacts,
    schoolSetup: schoolFacts,
  });
  const eventsBlock = formatEventContext(upcomingEvents);

  const generation = await generateText({
    systemPrompt: buildInboxDraftSystemPrompt(),
    userPrompt: buildInboxDraftUserPrompt({
      thread: input.thread,
      inboundMessage: input.inboundMessage,
      organizationBlock,
      eventsBlock,
    }),
    model: resolveFastDraftModel(),
    maxTokens: 300,
  });

  if (!generation.success || !generation.text?.trim()) {
    return {
      success: false,
      draftBody: null,
      error: generation.error ?? "Could not generate a draft reply.",
    };
  }

  const draftBody = generation.text.trim();
  const now = new Date().toISOString();
  const supabase = await createClient();

  const { error } = await supabase
    .from("inbox_messages")
    .update({
      ai_draft_body: draftBody,
      ai_draft_generated_at: now,
      updated_at: now,
    })
    .eq("id", input.inboundMessage.id)
    .eq("organization_id", input.organizationId);

  if (error) {
    return {
      success: false,
      draftBody: null,
      error: "Draft was generated but could not be saved.",
    };
  }

  return { success: true, draftBody, error: null };
}
