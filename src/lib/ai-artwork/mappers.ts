import type { ArtworkConcept, ArtworkConceptRow } from "@/lib/ai-artwork/types";

export function mapArtworkConceptRow(row: ArtworkConceptRow): ArtworkConcept {
  return {
    id: row.id,
    eventId: row.event_id,
    eventAssetId: row.event_asset_id,
    batchId: row.batch_id,
    conceptIndex: row.concept_index,
    storagePath: row.storage_path,
    filename: row.filename,
    generationPrompt: row.generation_prompt,
    additionalInstructions: row.additional_instructions,
    negativeInstructions: row.negative_instructions,
    imageSizePreset: row.image_size_preset,
    style: row.style,
    variationType: row.variation_type,
    inspirationAssetId: row.inspiration_asset_id,
    provider: row.provider as ArtworkConcept["provider"],
    model: row.model,
    status: row.status,
    createdAt: row.created_at,
  };
}
