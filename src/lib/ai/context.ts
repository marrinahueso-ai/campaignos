import { getCampaignIntelligenceForEvent } from "@/lib/campaign-intelligence/queries";
import { buildGroundingContext, hasUploadedArtwork } from "@/lib/ai-grounding";
import { buildBrandVoiceContext } from "@/lib/brand-voice";
import { buildCommunicationStrategyForDraft } from "@/lib/ai-strategy";
import type { DraftPerformanceTracker } from "@/lib/ai/draft-performance";
import { COMMUNICATION_STRATEGY_LABELS } from "@/lib/events/communication-strategy";
import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { buildDraftUserPrompt, lengthGuidanceForChannel } from "@/lib/ai/prompts";
import { displayDraftContent } from "@/lib/ai/content";
import type { CommunicationDraftContext } from "@/lib/ai/types";
import { getEventById } from "@/lib/events/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { formatEventDate, formatEventTime } from "@/lib/utils/dates";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

function channelToneForProfile(
  channel: CommunicationChannel,
  profile: Awaited<ReturnType<typeof getAiProfileByOrganizationId>>,
): string | null {
  if (!profile) return null;

  switch (channel) {
    case "facebook":
      return profile.facebookTone;
    case "instagram":
      return profile.instagramTone;
    case "website_announcement":
      return profile.websiteTone;
    case "principal_notes":
    case "morning_announcements":
      return profile.principalMessagingStyle;
    default:
      return profile.communicationPreferences;
  }
}

async function measurePromise<T>(
  promise: Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await promise;
  return { result, durationMs: performance.now() - start };
}

export async function buildCommunicationDraftContext(
  input: {
    eventId: string;
    communicationItemId: string;
    channel: CommunicationChannel;
    stepId?: string | null;
    instructions?: string | null;
    existingDraft?: string | null;
  },
  performance?: DraftPerformanceTracker,
): Promise<CommunicationDraftContext | null> {
  const [eventMeasured, organizationMeasured, workspaceMeasured, groundingMeasured] =
    await Promise.all([
      measurePromise(getEventById(input.eventId)),
      measurePromise(getLatestOrganization()),
      measurePromise(getEventWorkspaceData(input.eventId)),
      measurePromise(
        buildGroundingContext({
          eventId: input.eventId,
          channel: input.channel,
          stepId: input.stepId,
        }),
      ),
    ]);

  performance?.record(
    "eventLoad",
    Math.max(
      eventMeasured.durationMs,
      organizationMeasured.durationMs,
      workspaceMeasured.durationMs,
    ),
  );
  performance?.record("grounding", groundingMeasured.durationMs);

  const event = eventMeasured.result;
  const organization = organizationMeasured.result;
  const workspace = workspaceMeasured.result;
  const groundingContext = groundingMeasured.result;

  if (!event || !groundingContext) return null;

  const commItem = workspace?.communications.find(
    (item) => item.id === input.communicationItemId,
  );
  const existingDraft =
    input.existingDraft?.trim() ||
    (commItem?.latestContent
      ? displayDraftContent(commItem.latestContent)
      : null) ||
    null;

  const brandVoiceContext = performance
    ? await performance.time("brandVoice", () =>
        buildBrandVoiceContext({
          organizationId: organization?.id ?? null,
          organizationName: organization?.name ?? null,
          channel: input.channel,
          eventTitle: event.title,
          eventId: input.eventId,
          communicationItemId: input.communicationItemId,
        }),
      )
    : await buildBrandVoiceContext({
        organizationId: organization?.id ?? null,
        organizationName: organization?.name ?? null,
        channel: input.channel,
        eventTitle: event.title,
        eventId: input.eventId,
        communicationItemId: input.communicationItemId,
      });

  const strategyPlan = performance
    ? await performance.time("strategy", () =>
        buildCommunicationStrategyForDraft({
          ...input,
          existingDraft,
          groundingContext,
          brandVoiceContext,
        }),
      )
    : await buildCommunicationStrategyForDraft({
        ...input,
        existingDraft,
        groundingContext,
        brandVoiceContext,
      });

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
    // Intelligence is optional context — never block drafting
  }

  return {
    organizationName: organization?.name ?? null,
    organizationVoice: profile?.organizationVoice ?? null,
    audienceDefaults: profile?.audienceDefaults ?? event.audience,
    writingStyle: profile?.writingStyle ?? null,
    channelTone: channelToneForProfile(input.channel, profile),
    emojiUsage: profile?.emojiUsage ?? null,
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
    campaignSummary,
    campaignCompletionPercent,
    artworkAvailable: hasUploadedArtwork(groundingContext.artwork),
    channel: input.channel,
    channelLabel: channelLabel(input.channel),
    existingDraft,
    lengthGuidance: lengthGuidanceForChannel(input.channel),
    optionalInstructions: input.instructions?.trim() || null,
    strategyPlan,
    groundingContext,
    brandVoiceContext,
  };
}

export { buildDraftUserPrompt };
