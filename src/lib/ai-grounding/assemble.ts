import { COMMUNICATION_CHANNELS } from "@/lib/event-workspace/constants";
import { hasVerifiedVolunteerNeeds } from "@/lib/events/volunteer-needs";
import type {
  CommunicationStrategyGroundingFacts,
  EventGroundingFacts,
  GroundingContext,
  OrganizationGroundingFacts,
  SchoolSetupGroundingFacts,
  TimelineStepGroundingFacts,
} from "@/lib/ai-grounding/types";
import type { ArtworkGroundingFact } from "@/lib/ai-grounding/types";
import type { CommunicationChannel } from "@/types/event-workspace";

function channelLabel(channel: CommunicationChannel): string {
  return (
    COMMUNICATION_CHANNELS.find((entry) => entry.channel === channel)?.label ??
    channel.replaceAll("_", " ")
  );
}

function buildAllowedTopics(input: {
  event: EventGroundingFacts;
  organization: OrganizationGroundingFacts;
  artwork: ArtworkGroundingFact[];
  timelineStep: TimelineStepGroundingFacts | null;
  campaignStageLabel?: string | null;
}): string[] {
  const topics: string[] = [
    `Event title: ${input.event.title}`,
    `Event date: ${input.event.date}`,
  ];

  if (input.event.time) topics.push(`Event time: ${input.event.time}`);
  if (input.event.location) topics.push(`Location: ${input.event.location}`);
  if (input.event.audience) topics.push(`Audience: ${input.event.audience}`);
  if (input.event.theme) topics.push(`Theme: ${input.event.theme}`);
  if (input.event.description) topics.push("Event description (as provided)");
  if (input.event.eventTypeLabel) {
    topics.push(`Event type: ${input.event.eventTypeLabel}`);
  }
  if (input.event.category) topics.push(`Category: ${input.event.category}`);
  if (input.event.budget) topics.push(`Budget: ${input.event.budget}`);
  if (hasVerifiedVolunteerNeeds(input.event.volunteerNeeds)) {
    topics.push(`Volunteer needs: ${input.event.volunteerNeeds}`);
  }
  if (input.event.eventOwner) topics.push(`Event owner: ${input.event.eventOwner}`);
  if (input.organization.name) {
    topics.push(`Organization: ${input.organization.name}`);
  }
  if (input.organization.mascot) {
    topics.push(`Mascot: ${input.organization.mascot}`);
  }
  if (input.organization.principal) {
    topics.push(`Principal: ${input.organization.principal}`);
  }
  if (input.timelineStep) {
    topics.push(
      `Timeline step: ${input.timelineStep.stepTitle} (${input.timelineStep.channelLabel})`,
    );
  }
  if (input.campaignStageLabel) {
    topics.push(`Campaign stage: ${input.campaignStageLabel}`);
  }
  for (const asset of input.artwork) {
    topics.push(
      `Uploaded artwork: ${asset.assetTypeLabel}${asset.filename ? ` (${asset.filename})` : ""}`,
    );
  }

  return topics;
}

function buildOmittedTopics(input: {
  event: EventGroundingFacts;
  organization: OrganizationGroundingFacts;
  artwork: ArtworkGroundingFact[];
}): string[] {
  const omitted: string[] = [];

  if (!input.event.time) omitted.push("event time / start time");
  if (!input.event.location) omitted.push("location / venue");
  if (!hasVerifiedVolunteerNeeds(input.event.volunteerNeeds)) {
    omitted.push(
      "volunteers / volunteer roles / volunteer counts / sign-up asks / volunteer CTAs (FORBIDDEN — no volunteer information on file)",
    );
  }
  if (!input.organization.mascot) {
    omitted.push("mascot / school nickname / spirit animal references");
  }
  if (!input.event.theme) omitted.push("event theme");
  if (!input.event.budget) omitted.push("budget / fundraising goals / dollar amounts");
  if (input.artwork.length === 0) {
    omitted.push("artwork / graphics / images / flyers / attached visuals");
  }
  omitted.push("sponsors / donors / partners (not in verified facts)");
  omitted.push("specific activities not in event description");
  omitted.push("quantities / headcounts / attendance numbers");

  return omitted;
}

export function assembleGroundingContext(input: {
  event: EventGroundingFacts;
  organization: OrganizationGroundingFacts;
  schoolSetup: SchoolSetupGroundingFacts;
  artwork: ArtworkGroundingFact[];
  timelineStep: TimelineStepGroundingFacts | null;
  channel: CommunicationChannel;
  campaignStageLabel?: string | null;
  campaignStageDescription?: string | null;
}): GroundingContext {
  const strategy: CommunicationStrategyGroundingFacts = {
    campaignStageLabel: input.campaignStageLabel?.trim() || null,
    campaignStageDescription: input.campaignStageDescription?.trim() || null,
    channel: input.channel,
    channelLabel: channelLabel(input.channel),
  };

  return {
    event: input.event,
    organization: input.organization,
    schoolSetup: input.schoolSetup,
    artwork: input.artwork,
    timelineStep: input.timelineStep,
    strategy,
    allowedTopics: buildAllowedTopics(input),
    omittedTopics: buildOmittedTopics(input),
  };
}

export function enrichGroundingWithCampaignStage(
  grounding: GroundingContext,
  campaignStage: { label: string; description: string },
): GroundingContext {
  const hasStageTopic = grounding.allowedTopics.some((topic) =>
    topic.startsWith("Campaign stage:"),
  );

  return {
    ...grounding,
    strategy: {
      ...grounding.strategy,
      campaignStageLabel: campaignStage.label,
      campaignStageDescription: campaignStage.description,
    },
    allowedTopics: hasStageTopic
      ? grounding.allowedTopics
      : [...grounding.allowedTopics, `Campaign stage: ${campaignStage.label}`],
  };
}
