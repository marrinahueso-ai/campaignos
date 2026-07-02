import type { ArtworkWorkflowItem } from "@/lib/creative-studio/artwork-workflow";

export type ArtworkV2Step = "pick" | "create" | "review" | "approved";

export type ArtworkV2ReferenceSource = "upload" | "event_file" | null;

export interface ArtworkV2Reference {
  id: string;
  source: ArtworkV2ReferenceSource;
  label: string;
  previewUrl: string | null;
  eventAssetId?: string | null;
  file?: File | null;
}

export interface ArtworkV2Session {
  item: ArtworkWorkflowItem;
  prompt: string;
  references: ArtworkV2Reference[];
}

/** One generated version shown in the review comparison grid. */
export interface ArtworkV2ReviewVersion {
  id: string;
  index: number;
  imageUrl: string | null;
}

export type ArtworkV2GenerationResult = {
  success: boolean;
  error: string | null;
  warning?: string | null;
  /** Original user-typed prompt — never rewritten by CampaignOS. */
  userPrompt?: string;
  /** GPT-5.5 orchestrated prompt sent to gpt-image-1. */
  orchestratedPrompt?: string;
  /** @deprecated Use userPrompt / orchestratedPrompt. */
  finalPrompt?: string;
  assetId?: string;
  versions?: ArtworkV2ReviewVersion[];
  /** Public URL of artwork after approval — for download UI. */
  approvedImageUrl?: string | null;
};
