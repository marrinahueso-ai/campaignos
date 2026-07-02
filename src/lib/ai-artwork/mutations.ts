import "server-only";

import { randomUUID } from "node:crypto";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import type {
  ArtworkConceptRow,
  ArtworkGenerationSettings,
} from "@/lib/ai-artwork/types";

export async function saveGenerationSettings(
  eventId: string,
  assetId: string,
  settings: ArtworkGenerationSettings,
  smartPrompt?: string,
): Promise<boolean> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {
    generation_settings: settings,
    updated_at: new Date().toISOString(),
  };
  if (smartPrompt !== undefined) {
    payload.generation_prompt = smartPrompt;
  }

  let { error } = await supabase
    .from("event_assets")
    .update(payload)
    .eq("id", assetId)
    .eq("event_id", eventId);

  if (error && isMissingSchemaError(error)) {
    if (smartPrompt !== undefined) {
      ({ error } = await supabase
        .from("event_assets")
        .update({ generation_prompt: smartPrompt, updated_at: new Date().toISOString() })
        .eq("id", assetId)
        .eq("event_id", eventId));
    } else {
      return true;
    }
  }

  return !error;
}

export async function insertArtworkConcept(
  row: Omit<ArtworkConceptRow, "id" | "created_at" | "status">,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_artwork_concepts")
    .insert({
      ...row,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    console.error("Failed to insert artwork concept:", error.message);
    return null;
  }

  return data?.id as string;
}

export async function discardConcept(conceptId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_artwork_concepts")
    .update({ status: "discarded" })
    .eq("id", conceptId);

  if (error && isMissingSchemaError(error)) return true;
  return !error;
}

export async function deleteConceptRow(conceptId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("event_artwork_concepts").delete().eq("id", conceptId);
  if (error && isMissingSchemaError(error)) return true;
  return !error;
}

export function createConceptBatchId(): string {
  return randomUUID();
}

export async function setAssetPlanStatusInProgress(
  eventId: string,
  assetId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_assets")
    .update({ plan_status: "in_progress", updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("event_id", eventId);

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}

export async function setAssetPlanStatusGenerated(
  eventId: string,
  assetId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_assets")
    .update({ plan_status: "generated", updated_at: new Date().toISOString() })
    .eq("id", assetId)
    .eq("event_id", eventId);

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}
