import "server-only";

import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { mapArtworkConceptRow } from "@/lib/ai-artwork/mappers";
import type { ArtworkConcept, ArtworkConceptRow } from "@/lib/ai-artwork/types";

export async function getConceptsForAsset(
  eventAssetId: string,
): Promise<ArtworkConcept[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_artwork_concepts")
    .select("*")
    .eq("event_asset_id", eventAssetId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    console.error("Failed to fetch artwork concepts:", error.message);
    return [];
  }

  return ((data ?? []) as ArtworkConceptRow[]).map(mapArtworkConceptRow);
}

export async function getPendingConceptsForAsset(
  eventAssetId: string,
): Promise<ArtworkConcept[]> {
  const concepts = await getConceptsForAsset(eventAssetId);
  return concepts.filter((concept) => concept.status === "pending");
}

export async function getConceptsByBatch(batchId: string): Promise<ArtworkConcept[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_artwork_concepts")
    .select("*")
    .eq("batch_id", batchId)
    .order("concept_index", { ascending: true });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    return [];
  }

  return ((data ?? []) as ArtworkConceptRow[]).map(mapArtworkConceptRow);
}

export async function getConceptsForEvent(
  eventId: string,
): Promise<Record<string, ArtworkConcept[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_artwork_concepts")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return {};
    return {};
  }

  const map: Record<string, ArtworkConcept[]> = {};
  for (const row of (data ?? []) as ArtworkConceptRow[]) {
    const concept = mapArtworkConceptRow(row);
    const list = map[concept.eventAssetId] ?? [];
    list.push(concept);
    map[concept.eventAssetId] = list;
  }
  return map;
}

export async function getConceptById(conceptId: string): Promise<ArtworkConcept | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_artwork_concepts")
    .select("*")
    .eq("id", conceptId)
    .maybeSingle();

  if (error || !data) {
    if (error && !isMissingSchemaError(error)) {
      console.error("Failed to fetch artwork concept:", error.message);
    }
    return null;
  }

  return mapArtworkConceptRow(data as ArtworkConceptRow);
}
