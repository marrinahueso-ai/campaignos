import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { CommunicationChannel, EventAssetType } from "@/types/event-workspace";
import type { EventType } from "@/types/playbooks";

export interface EventGroundingFacts {
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  theme: string | null;
  description: string;
  communicationStrategy: CommunicationStrategy;
  communicationStrategyLabel: string;
  eventType: EventType | null;
  eventTypeLabel: string | null;
  category: string | null;
  budget: string | null;
  volunteerNeeds: string | null;
  eventOwner: string | null;
}

export interface OrganizationGroundingFacts {
  name: string | null;
  district: string | null;
  schoolYear: string | null;
  mascot: string | null;
  principal: string | null;
  schoolWebsite: string | null;
  ptoWebsite: string | null;
  organizationVoice: string | null;
  writingStyle: string | null;
  audienceDefaults: string | null;
  communicationPreferences: string | null;
}

export interface SchoolSetupGroundingFacts {
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  hasPtoLogo: boolean;
  hasSchoolLogo: boolean;
}

export interface ArtworkGroundingFact {
  assetType: EventAssetType;
  assetTypeLabel: string;
  filename: string | null;
  aiGenerated: boolean;
}

export interface TimelineStepGroundingFacts {
  stepId: string;
  stepTitle: string;
  relativeDay: number;
  dueDate: string;
  channel: CommunicationChannel;
  channelLabel: string;
  isRequired: boolean;
}

export interface CommunicationStrategyGroundingFacts {
  campaignStageLabel: string | null;
  campaignStageDescription: string | null;
  channel: CommunicationChannel;
  channelLabel: string;
}

export interface GroundingContext {
  event: EventGroundingFacts;
  organization: OrganizationGroundingFacts;
  schoolSetup: SchoolSetupGroundingFacts;
  artwork: ArtworkGroundingFact[];
  timelineStep: TimelineStepGroundingFacts | null;
  strategy: CommunicationStrategyGroundingFacts;
  /** Verified facts the model may reference. Omitted categories must not be invented. */
  allowedTopics: string[];
  /** Explicit omissions — categories with no verified data. */
  omittedTopics: string[];
}

export interface BuildGroundingContextInput {
  eventId: string;
  channel: CommunicationChannel;
  stepId?: string | null;
  campaignStageLabel?: string | null;
  campaignStageDescription?: string | null;
}
