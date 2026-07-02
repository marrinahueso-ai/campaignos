import type { EventAssetType } from "@/types/event-workspace";
import type {
  CreativePlanStatus,
  InspirationMatchResult,
  AiReviewResult,
} from "@/types/event-workspace";

export type { CreativePlanStatus, AiReviewResult, InspirationMatchResult };

export type CreativeStudioTabId =
  | "overview"
  | "brief"
  | "planner"
  | "artwork"
  | "inspiration"
  | "brand-kit"
  | "history";

export interface CreativeBrief {
  campaignTitle: string;
  personality: string[];
  emotionalTone: string[];
  visualDirection: string;
  typographySuggestions: string;
  illustrationVsPhotography: "illustrated" | "photography" | "mixed" | "none";
  colorPalette: string[];
  iconRecommendations: string[];
  graphicStyle: string;
  textureBackgroundSuggestions: string;
  consistencyRules: string[];
  doNotUse: string[];
  moodSummary: string;
}

export interface CreativeBriefRow {
  event_id: string;
  brief: CreativeBrief | Record<string, unknown>;
  is_ai_enhanced: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleMemorySnapshot {
  style: string;
  colors: string[];
  composition: string;
  illustrationType: string;
  fontStyle: string;
  tone: string;
}

export interface StyleMemoryEntry {
  id: string;
  organizationId: string;
  sourceEventId: string | null;
  sourceAssetId: string | null;
  eventTitle: string;
  assetType: string;
  style: StyleMemorySnapshot;
  approvedAt: string;
}

export interface StyleMemoryRow {
  id: string;
  organization_id: string;
  source_event_id: string | null;
  source_asset_id: string | null;
  event_title: string;
  asset_type: string;
  style: StyleMemorySnapshot | Record<string, unknown>;
  approved_at: string;
  created_at: string;
}

export interface AssetPlanSpec {
  assetType: EventAssetType;
  label: string;
  channels: import("@/types/event-workspace").CommunicationChannel[];
  optional?: boolean;
}

export interface AssetPlanItem {
  assetId: string | null;
  assetType: EventAssetType;
  label: string;
  planStatus: CreativePlanStatus;
  generationPrompt: string | null;
  aiReview: AiReviewResult | null;
  inspirationMatch: InspirationMatchResult | null;
  hasUpload: boolean;
  filename: string | null;
  storagePath: string | null;
  tags: string[];
  optional: boolean;
}

export interface CreativeDirectorContext {
  event: import("@/types").Event;
  organizationName: string | null;
  organizationVoice: string | null;
  brandColors: string[];
  communications: import("@/types/event-workspace").CommunicationItem[];
  playbookStepCount: number;
  inspirationAssets: import("@/lib/creative-assets/types").InspirationAsset[];
  styleMemory: StyleMemoryEntry[];
  assets: import("@/types/event-workspace").EventAsset[];
}

export interface CreativeDirectorData {
  brief: CreativeBrief | null;
  briefIsAiEnhanced: boolean;
  assetPlan: AssetPlanItem[];
  styleMemory: StyleMemoryEntry[];
}
