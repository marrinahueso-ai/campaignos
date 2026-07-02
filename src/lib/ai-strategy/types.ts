import type { CommunicationStrategy } from "@/types/communication-strategy";
import type { CommunicationChannel } from "@/types/event-workspace";
import type { EventCommunicationStep } from "@/types/playbooks";
import type { ArtworkGroundingFact, GroundingContext } from "@/lib/ai-grounding/types";
import type { BrandVoiceContext } from "@/lib/brand-voice/types";

import type { DefaultCtaStyle } from "@/types/organization-intelligence";

export type CampaignStageId =
  | "announcement"
  | "reminder"
  | "day_before"
  | "today"
  | "thank_you";

export interface CampaignStage {
  id: CampaignStageId;
  label: string;
  description: string;
  relativeDay: number | null;
  urgency: "low" | "medium" | "high" | "peak";
}

export interface CommunicationIntent {
  goal: string;
  focus: string;
  desiredEmotion: string;
  messagingAngle: string;
}

export interface AudienceProfile {
  primary: string;
  secondary: string | null;
  readingLevel: OrganizationReadingLevel;
  addressStyle: string;
}

export interface CtaDefinition {
  text: string;
  action: string;
}

export interface CtaStrategy {
  primary: CtaDefinition;
  secondary: CtaDefinition | null;
}

export type OrganizationReadingLevel =
  | "elementary_families"
  | "general_families"
  | "staff_and_families";

export type OrganizationFirstPersonStyle =
  | "we"
  | "school"
  | "pto"
  | "community";

export interface OrganizationVoice {
  tone: string;
  readingLevel: OrganizationReadingLevel;
  emojiUsage: "none" | "minimal" | "moderate" | "frequent";
  firstPersonStyle: OrganizationFirstPersonStyle;
  preferredBrandWords: string[];
  writingStyle: string | null;
  channelTone: string | null;
  sourceVoiceNotes: string | null;
}

export interface ToneGuidance {
  summary: string;
  voiceNotes: string[];
  channelAdjustments: string[];
}

export interface ArtDirection {
  artworkAvailable: boolean;
  artworkFacts: ArtworkGroundingFact[];
  strategy: string;
  visualReferences: string[];
  layoutNotes: string | null;
}

export interface RepetitionAvoidance {
  hasPriorMessages: boolean;
  coveredTopics: string[];
  instruction: string;
  otherChannelSummaries: string[];
}

export interface PriorCampaignGuidance {
  hasHistory: boolean;
  priorRunCount: number;
  lastRunDate: string | null;
  guidance: string;
}

export interface ExistingCommunicationSummary {
  communicationItemId: string;
  channel: CommunicationChannel;
  channelLabel: string;
  stepTitle: string | null;
  contentPreview: string;
  isCurrentItem: boolean;
}

export interface CommunicationStrategyInput {
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventDescription: string;
  eventLocation: string | null;
  eventAudience: string | null;
  eventTheme: string | null;
  communicationStrategy: CommunicationStrategy;
  communicationStrategyLabel: string;
  channel: CommunicationChannel;
  channelLabel: string;
  organizationName: string | null;
  organizationVoice: OrganizationVoice;
  organizationAudienceDefaults: string | null;
  campaignSummary: string | null;
  campaignCompletionPercent: number | null;
  artworkAvailable: boolean;
  playbookStep: EventCommunicationStep | null;
  existingCommunications: ExistingCommunicationSummary[];
  priorCampaign: PriorCampaignGuidance | null;
  optionalInstructions: string | null;
  existingDraft?: string | null;
  defaultCtaStyle: DefaultCtaStyle | null;
  volunteerNeeds: string | null;
  groundingContext: GroundingContext;
  brandVoiceContext: BrandVoiceContext;
}

export interface CommunicationStrategyPlan {
  campaignStage: CampaignStage;
  intent: CommunicationIntent;
  audience: AudienceProfile;
  tone: ToneGuidance;
  organizationVoice: OrganizationVoice;
  cta: CtaStrategy;
  artDirection: ArtDirection;
  channel: CommunicationChannel;
  channelLabel: string;
  channelGuidance: string;
  recommendedLength: string;
  emojiPolicy: string;
  repetitionAvoidance: RepetitionAvoidance;
  priorCampaignGuidance: PriorCampaignGuidance | null;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventDescription: string;
  eventLocation: string | null;
  eventTheme: string | null;
  communicationStrategyLabel: string;
  optionalInstructions: string | null;
  existingDraft: string | null;
  groundingContext: GroundingContext;
  brandVoiceContext: BrandVoiceContext;
}

export interface StrategyDraftPromptBundle {
  systemPrompt: string;
  userPrompt: string;
  strategyExplanation: string;
}

export interface ParsedStrategyDraftResponse {
  draftText: string;
  strategyExplanation: string;
}
