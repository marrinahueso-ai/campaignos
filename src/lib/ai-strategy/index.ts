import { resolveAudience } from "@/lib/ai-strategy/audience";
import { resolveArtDirection } from "@/lib/ai-strategy/art-direction";
import { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
import { resolveCommunicationIntent } from "@/lib/ai-strategy/communication-intent";
import { resolveCtaStrategy } from "@/lib/ai-strategy/cta";
import {
  buildRepetitionAvoidance,
  buildStrategyDraftPrompts,
  channelGuidanceFor,
  recommendedLengthFor,
} from "@/lib/ai-strategy/prompt-builder";
import {
  buildOrganizationVoice,
  resolveEmojiPolicy,
  resolveToneGuidance,
} from "@/lib/ai-strategy/tone";
import type {
  CommunicationStrategyInput,
  CommunicationStrategyPlan,
  ExistingCommunicationSummary,
  PriorCampaignGuidance,
  StrategyDraftPromptBundle,
} from "@/lib/ai-strategy/types";
import { displayDraftContent } from "@/lib/ai/content";
import {
  buildGroundingContext,
  enrichGroundingWithCampaignStage,
  hasUploadedArtwork,
} from "@/lib/ai-grounding";
import type { GroundingContext } from "@/lib/ai-grounding/types";
import type { BrandVoiceContext } from "@/lib/brand-voice/types";
import { buildBrandVoiceContext } from "@/lib/brand-voice";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import {
  getStepCommunicationItemRowsForEvent,
} from "@/lib/event-workspace/communication-items";
import { mapLatestContentByItemId } from "@/lib/event-workspace/mappers";
import { getEventHistoryContext } from "@/lib/memory/queries";
import { getEventPlaybookData } from "@/lib/playbooks/queries";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { getCampaignIntelligenceForEvent } from "@/lib/campaign-intelligence/queries";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { sanitizeVolunteerNeeds } from "@/lib/events/volunteer-needs";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { CommunicationVersionRow } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";
import { createClient } from "@/lib/supabase/server";

export type {
  CommunicationStrategyInput,
  CommunicationStrategyPlan,
  ExistingCommunicationSummary,
  OrganizationVoice,
  ParsedStrategyDraftResponse,
  PriorCampaignGuidance,
  RepetitionAvoidance,
  StrategyDraftPromptBundle,
} from "@/lib/ai-strategy/types";

export {
  buildRegenerationBlock,
  buildStrategyDraftPrompts,
  buildStrategyExplanation,
  buildStrategySystemPrompt,
  buildStrategyUserPrompt,
  channelGuidanceFor,
  parseStrategyDraftResponse,
  recommendedLengthFor,
} from "@/lib/ai-strategy/prompt-builder";

export { resolveCampaignStage } from "@/lib/ai-strategy/campaign-stage";
export { resolveCommunicationIntent } from "@/lib/ai-strategy/communication-intent";
export { resolveAudience } from "@/lib/ai-strategy/audience";
export { resolveCtaStrategy } from "@/lib/ai-strategy/cta";
export {
  buildOrganizationVoice,
  resolveEmojiPolicy,
  resolveToneGuidance,
} from "@/lib/ai-strategy/tone";
export { resolveArtDirection } from "@/lib/ai-strategy/art-direction";

function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

function buildExistingHubCommunicationSummaries(
  communications: NonNullable<Awaited<ReturnType<typeof getEventWorkspaceData>>>["communications"],
  currentItemId: string,
): ExistingCommunicationSummary[] {
  if (!communications) return [];

  return communications.flatMap((item) => {
    const content = displayDraftContent(item.latestContent);
    if (!content) return [];

    return [
      {
        communicationItemId: item.id,
        channel: item.channel,
        channelLabel: channelLabel(item.channel),
        stepTitle: null,
        contentPreview: content,
        isCurrentItem: item.id === currentItemId,
      },
    ];
  });
}

async function buildExistingStepCommunicationSummaries(
  eventId: string,
  currentItemId: string,
  steps: EventCommunicationStep[],
): Promise<ExistingCommunicationSummary[]> {
  const itemRows = await getStepCommunicationItemRowsForEvent(eventId);
  if (itemRows.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const itemIds = itemRows.map((row) => row.id);
  const { data: versions } = await supabase
    .from("communication_versions")
    .select("*")
    .in("communication_item_id", itemIds)
    .order("version_number", { ascending: false });

  const contentMap = mapLatestContentByItemId(
    (versions ?? []) as CommunicationVersionRow[],
  );

  const stepById = new Map(steps.map((step) => [step.id, step]));
  const summaries: ExistingCommunicationSummary[] = [];

  for (const item of itemRows) {
    const rawContent = contentMap.get(item.id) ?? "";
    const content = displayDraftContent(rawContent);
    if (!content) continue;

    const stepId = item.event_communication_step_id as string;
    const step = stepById.get(stepId);

    summaries.push({
      communicationItemId: item.id,
      channel: item.channel,
      channelLabel: channelLabel(item.channel),
      stepTitle: step?.title ?? null,
      contentPreview: content,
      isCurrentItem: item.id === currentItemId,
    });
  }

  return summaries;
}

async function buildPriorCampaignGuidance(
  eventId: string,
): Promise<PriorCampaignGuidance | null> {
  const event = await getEventById(eventId);
  if (!event) return null;

  try {
    const history = await getEventHistoryContext(event);
    if (history.priorRunCount === 0) {
      return { hasHistory: false, priorRunCount: 0, lastRunDate: null, guidance: "" };
    }

    return {
      hasHistory: true,
      priorRunCount: history.priorRunCount,
      lastRunDate: history.lastRunDate,
      guidance: history.hasPriorArtwork
        ? "Prior runs included artwork — consider fresh visuals or updated messaging rather than repeating last year's framing."
        : "Prior runs exist — build on what worked without copying previous wording.",
    };
  } catch {
    return null;
  }
}

export function buildCommunicationStrategyPlan(
  input: CommunicationStrategyInput,
): CommunicationStrategyPlan {
  const campaignStage = resolveCampaignStage({
    relativeDay: input.playbookStep?.relativeDay ?? null,
    stepTitle: input.playbookStep?.title ?? null,
    eventDate: input.eventDate,
  });

  const intent = resolveCommunicationIntent({
    stageId: campaignStage.id,
    channel: input.channel,
    communicationStrategy: input.communicationStrategy,
  });

  const audience = resolveAudience({
    eventAudience: input.eventAudience,
    organizationAudienceDefaults: input.organizationAudienceDefaults,
    channel: input.channel,
    organizationVoice: input.organizationVoice,
  });

  const tone = resolveToneGuidance({
    organizationVoice: input.organizationVoice,
    channel: input.channel,
    campaignStageLabel: campaignStage.label,
  });

  const cta = resolveCtaStrategy({
    stageId: campaignStage.id,
    channel: input.channel,
    defaultCtaStyle: input.defaultCtaStyle,
    volunteerNeeds: input.volunteerNeeds,
  });

  const artDirection = resolveArtDirection({
    artworkFacts: input.groundingContext.artwork,
    channel: input.channel,
    stageId: campaignStage.id,
    eventTheme: input.eventTheme,
  });

  const repetitionAvoidance = buildRepetitionAvoidance({
    existingCommunications: input.existingCommunications,
  });

  const groundingContext = enrichGroundingWithCampaignStage(
    input.groundingContext,
    campaignStage,
  );

  return {
    campaignStage,
    intent,
    audience,
    tone,
    organizationVoice: input.organizationVoice,
    cta,
    artDirection,
    channel: input.channel,
    channelLabel: input.channelLabel,
    channelGuidance: channelGuidanceFor(input.channel),
    recommendedLength: recommendedLengthFor(input.channel),
    emojiPolicy: resolveEmojiPolicy(input.organizationVoice.emojiUsage),
    repetitionAvoidance,
    priorCampaignGuidance: input.priorCampaign,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    eventTime: input.eventTime,
    eventDescription: input.eventDescription,
    eventLocation: input.eventLocation,
    eventTheme: input.eventTheme,
    communicationStrategyLabel: input.communicationStrategyLabel,
    optionalInstructions: input.optionalInstructions,
    existingDraft: input.existingDraft?.trim() || null,
    groundingContext,
    brandVoiceContext: input.brandVoiceContext,
  };
}

export async function buildCommunicationStrategyForDraft(input: {
  eventId: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  stepId?: string | null;
  instructions?: string | null;
  existingDraft?: string | null;
  groundingContext?: GroundingContext | null;
  brandVoiceContext?: BrandVoiceContext | null;
}): Promise<CommunicationStrategyPlan | null> {
  const [event, organization, workspace, playbookData, priorCampaign, groundingContext] =
    await Promise.all([
      getEventById(input.eventId),
      getLatestOrganization(),
      getEventWorkspaceData(input.eventId),
      getEventPlaybookData(input.eventId),
      buildPriorCampaignGuidance(input.eventId),
      input.groundingContext
        ? Promise.resolve(input.groundingContext)
        : buildGroundingContext({
            eventId: input.eventId,
            channel: input.channel,
            stepId: input.stepId,
          }),
    ]);

  if (!event || !groundingContext) return null;

  const brandVoiceContext =
    input.brandVoiceContext ??
    (await buildBrandVoiceContext({
      organizationId: organization?.id ?? null,
      organizationName: organization?.name ?? null,
      channel: input.channel,
      eventTitle: event.title,
      eventId: input.eventId,
      communicationItemId: input.communicationItemId,
    }));

  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;

  let campaignSummary: string | null = null;
  let campaignCompletionPercent: number | null = null;

  try {
    const intelligence = await getCampaignIntelligenceForEvent(event);
    campaignSummary = intelligence.summary;
    campaignCompletionPercent = intelligence.completionPercent;
  } catch {
    // Optional context
  }

  const playbookStep = input.stepId
    ? (playbookData?.steps.find((step) => step.id === input.stepId) ?? null)
    : null;

  const existingCommunications = input.stepId
    ? await buildExistingStepCommunicationSummaries(
        input.eventId,
        input.communicationItemId,
        playbookData?.steps ?? [],
      )
    : buildExistingHubCommunicationSummaries(
        workspace?.communications ?? [],
        input.communicationItemId,
      );

  const organizationVoice = buildOrganizationVoice(profile, input.channel);

  if (profile?.audienceDefaults) {
    organizationVoice.sourceVoiceNotes = [
      profile.organizationVoice,
      `Audience defaults: ${profile.audienceDefaults}`,
    ]
      .filter(Boolean)
      .join(" | ");
  }

  let existingDraft = input.existingDraft?.trim() || null;
  if (!existingDraft && workspace) {
    const commItem = workspace.communications.find(
      (item) => item.id === input.communicationItemId,
    );
    if (commItem?.latestContent) {
      existingDraft = displayDraftContent(commItem.latestContent);
    }
  }

  const strategyInput: CommunicationStrategyInput = {
    eventTitle: event.title,
    eventDate: formatEventDate(event.date),
    eventTime: event.time ? formatEventTime(event.time) : null,
    eventDescription: event.description,
    eventLocation: event.location,
    eventAudience: event.audience,
    eventTheme: event.theme,
    communicationStrategy: event.communicationStrategy,
    communicationStrategyLabel:
      COMMUNICATION_STRATEGY_LABELS[event.communicationStrategy] ??
      event.communicationStrategy,
    channel: input.channel,
    channelLabel: channelLabel(input.channel),
    organizationName: organization?.name ?? null,
    organizationVoice,
    organizationAudienceDefaults: profile?.audienceDefaults ?? null,
    campaignSummary,
    campaignCompletionPercent,
    artworkAvailable: hasUploadedArtwork(groundingContext.artwork),
    playbookStep,
    existingCommunications,
    priorCampaign,
    optionalInstructions: input.instructions?.trim() || null,
    existingDraft,
    defaultCtaStyle: profile?.defaultCtaStyle ?? null,
    volunteerNeeds: sanitizeVolunteerNeeds(event.volunteerNeeds),
    groundingContext,
    brandVoiceContext,
  };

  return buildCommunicationStrategyPlan(strategyInput);
}

export async function buildStrategyPromptsForDraft(input: {
  eventId: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  stepId?: string | null;
  instructions?: string | null;
}): Promise<StrategyDraftPromptBundle | null> {
  const plan = await buildCommunicationStrategyForDraft(input);
  if (!plan) return null;
  return buildStrategyDraftPrompts(plan);
}
