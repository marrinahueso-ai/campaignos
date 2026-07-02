import type { CommunicationChannel } from "@/types/event-workspace";
import type {
  DefaultCtaStyle,
  EmojiUsage,
  WritingStyle,
} from "@/types/organization-intelligence";

export type WarmthLevel = "reserved" | "warm" | "very_warm";
export type FormalityLevel = "casual" | "balanced" | "formal";
export type SentenceLengthPreference = "short" | "medium" | "long";
export type ParagraphLengthPreference = "short" | "medium" | "long";
export type PunctuationPreference = "minimal" | "standard" | "expressive";

export interface OrganizationVoiceProfile {
  organizationName: string | null;
  personality: string;
  readingLevel: string;
  sentenceLength: SentenceLengthPreference;
  paragraphLength: ParagraphLengthPreference;
  emojiUsage: EmojiUsage;
  punctuationPreference: PunctuationPreference;
  preferredCtaStyle: DefaultCtaStyle;
  writingStyle: WritingStyle | null;
  warmthLevel: WarmthLevel;
  formalityLevel: FormalityLevel;
  sourceVoiceNotes: string | null;
  firstPersonStyle: "we" | "school" | "pto" | "community";
}

export interface VocabularyDictionary {
  preferredTerms: string[];
  disallowedTerms: string[];
  preferredSchoolNames: string[];
  preferredPtoTerms: string[];
  preferredEventNames: string[];
  preferredBrandingLanguage: string[];
}

export interface ChannelPersonality {
  channel: CommunicationChannel;
  channelLabel: string;
  tone: string;
  targetLength: string;
  ctaStyle: string;
  formattingGuidance: string[];
  writingRules: string[];
}

export interface OpeningPattern {
  id: string;
  label: string;
  pattern: string;
  channels: CommunicationChannel[];
}

export interface ClosingPattern {
  id: string;
  label: string;
  pattern: string;
  channels: CommunicationChannel[];
}

export interface StyleRules {
  rules: string[];
  avoidPatterns: string[];
  corporateLanguageBan: string[];
}

export interface EditingMemoryRecord {
  id: string;
  organizationId: string;
  eventId: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  aiDraftPreview: string;
  approvedEditPreview: string;
  learnings: string[];
  createdAt: string;
}

export interface EditingMemorySummary {
  hasRecords: boolean;
  recentLearnings: string[];
  channelLearnings: string[];
}

export interface BrandVoiceScore {
  overall: number;
  strengths: string[];
  suggestions: string[];
  dimensions: {
    warmth: number;
    vocabulary: number;
    channelFit: number;
    clarity: number;
    communityTone: number;
  };
}

export interface BrandVoiceContext {
  profile: OrganizationVoiceProfile;
  vocabulary: VocabularyDictionary;
  channelPersonality: ChannelPersonality;
  styleRules: StyleRules;
  openingOptions: OpeningPattern[];
  closingOptions: ClosingPattern[];
  avoidOpenings: string[];
  editingMemory: EditingMemorySummary;
}

export interface BuildBrandVoiceContextInput {
  organizationId: string | null;
  organizationName: string | null;
  channel: CommunicationChannel;
  eventTitle: string;
  eventId?: string;
  communicationItemId?: string;
  usedOpeningHints?: string[];
}

export interface RecordEditingMemoryInput {
  organizationId: string;
  eventId: string;
  communicationItemId: string;
  channel: CommunicationChannel;
  aiDraft: string;
  approvedEdit: string;
}
