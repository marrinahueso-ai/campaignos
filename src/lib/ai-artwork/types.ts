import type { CreativeBrief } from "@/lib/creative-director/types";

export interface CampaignEventSnapshot {
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  audience: string | null;
  description: string;
  theme: string | null;
  volunteerNeeds: string | null;
}

export type ImageSizePreset =
  | "square"
  | "facebook"
  | "story"
  | "website_hero"
  | "newsletter_banner"
  | "custom";

export type ConceptStatus = "pending" | "approved" | "discarded";

export type VariationPresetId =
  | "more_playful"
  | "less_busy"
  | "brighter_colors"
  | "different_illustration"
  | "photography_version"
  | "minimal_version"
  | "same_layout_new_colors";

export type ArtworkProviderId = "openai" | "canva" | "adobe_express" | "ideogram" | "midjourney";

export type InspirationUsageMode = "image_reference" | "style_guidance_only";

export type InspirationStrength = "light" | "medium" | "strong";

export type ArtworkMode = "ready_to_post" | "background_only" | "text_safe_layout";

export type CreativeDirectionId =
  import("@/lib/ai-artwork/creative-direction").CreativeDirectionId;

export interface InspirationStyleProfile {
  sourceAssetId: string;
  subjectMatter: string;
  colorPalette: string;
  layout: string;
  visualType: string;
  illustrationStyle: string;
  whitespace: string;
  typographyFeel: string;
  composition: string;
  mood: string;
  avoidList: string;
  summary: string;
  analyzedAt: string;
}

export interface ArtworkGenerationSettings {
  artworkMode: ArtworkMode;
  creativeDirection: CreativeDirectionId;
  additionalInstructions: string;
  negativeInstructions: string;
  imageSizePreset: ImageSizePreset;
  customSize: string | null;
  style: string;
  inspirationAssetId: string | null;
  /** Secondary approved references used for style guidance in prompts. */
  supportInspirationAssetIds: string[];
  inspirationStrength: InspirationStrength;
  inspirationStyleProfile: InspirationStyleProfile | null;
  textPlan: ArtworkTextPlan | null;
  /** Power-user prompt override — never auto-filled from legacy smart prompts. */
  customPromptOverride: string | null;
}

export interface ArtworkTextPlan {
  headline: string;
  subheadline: string | null;
  dateTime: string | null;
  location: string | null;
  cta: string | null;
  footerBranding: string | null;
}

export interface ArtworkConcept {
  id: string;
  eventId: string;
  eventAssetId: string;
  batchId: string;
  conceptIndex: number;
  storagePath: string;
  filename: string;
  generationPrompt: string;
  additionalInstructions: string | null;
  negativeInstructions: string | null;
  imageSizePreset: ImageSizePreset;
  style: string | null;
  variationType: string | null;
  inspirationAssetId: string | null;
  provider: ArtworkProviderId;
  model: string | null;
  status: ConceptStatus;
  createdAt: string;
}

export interface ArtworkConceptRow {
  id: string;
  event_id: string;
  event_asset_id: string;
  batch_id: string;
  concept_index: number;
  storage_path: string;
  filename: string;
  generation_prompt: string;
  additional_instructions: string | null;
  negative_instructions: string | null;
  image_size_preset: ImageSizePreset;
  style: string | null;
  variation_type: string | null;
  inspiration_asset_id: string | null;
  provider: string;
  model: string | null;
  status: ConceptStatus;
  created_at: string;
}

export interface ArtworkGenerateRequest {
  prompt: string;
  size: string;
  model?: string;
  conceptIndex?: number;
  referenceImageUrl?: string | null;
  inspirationStrength?: InspirationStrength;
}

export interface ArtworkGenerateResult {
  success: boolean;
  imageBase64: string | null;
  revisedPrompt: string | null;
  model: string;
  provider: ArtworkProviderId;
  error: string | null;
}

export interface ArtworkProviderAdapter {
  id: ArtworkProviderId;
  label: string;
  isConfigured: () => boolean;
  supportsImageReference: boolean;
  inspirationUsageMode: InspirationUsageMode;
  generate: (input: ArtworkGenerateRequest) => Promise<ArtworkGenerateResult>;
}

export interface BuildArtworkPromptInput {
  brief: CreativeBrief | null;
  /** Optional power-user override from Advanced Prompt. */
  customPrompt?: string | null;
  settings: ArtworkGenerationSettings;
  assetLabel: string;
  eventFacts: import("@/lib/ai-artwork/event-facts").VerifiedEventFacts;
  eventType: string | null;
  brandColors: string[];
  styleMemory: import("@/lib/creative-director/types").StyleMemoryEntry[];
  textPlan: ArtworkTextPlan;
  inspiration?: import("@/lib/ai-artwork/inspiration").ResolvedInspirationContext | null;
  supportInspirations?: { eventTitle: string; summary: string }[];
  variationType?: string | null;
  conceptIndex?: number;
}

export interface ArtworkWorkspaceAsset {
  assetId: string;
  assetType: string;
  label: string;
  smartPrompt: string | null;
  generationSettings: ArtworkGenerationSettings | null;
  planStatus: string | null;
  hasUpload: boolean;
  storagePath: string | null;
  filename: string | null;
  aiGenerated: boolean;
}

export type ArtworkActionState = {
  success: boolean;
  error: string | null;
  warning?: string | null;
  batchId?: string;
  conceptIds?: string[];
};
