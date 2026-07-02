import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import type {
  AiReviewResult,
  CreativeBrief,
  CreativePlanStatus,
  InspirationMatchResult,
  StyleMemorySnapshot,
} from "@/lib/creative-director/types";

export async function upsertCreativeBrief(
  eventId: string,
  brief: CreativeBrief,
  isAiEnhanced: boolean,
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("event_creative_briefs").upsert(
    {
      event_id: eventId,
      brief,
      is_ai_enhanced: isAiEnhanced,
      updated_at: now,
    },
    { onConflict: "event_id" },
  );

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}

export async function updateAssetPlanFields(
  eventId: string,
  assetId: string,
  fields: {
    planStatus?: CreativePlanStatus;
    planLabel?: string | null;
    generationPrompt?: string | null;
    aiReview?: AiReviewResult | null;
    inspirationMatch?: InspirationMatchResult | null;
    tags?: string[];
  },
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const payload: Record<string, unknown> = { updated_at: now };
  if (fields.planStatus !== undefined) payload.plan_status = fields.planStatus;
  if (fields.planLabel !== undefined) payload.plan_label = fields.planLabel;
  if (fields.generationPrompt !== undefined) {
    payload.generation_prompt = fields.generationPrompt;
  }
  if (fields.aiReview !== undefined) payload.ai_review = fields.aiReview;
  if (fields.inspirationMatch !== undefined) {
    payload.inspiration_match = fields.inspirationMatch;
  }
  if (fields.tags !== undefined) payload.tags = fields.tags;

  let { error } = await supabase
    .from("event_assets")
    .update(payload)
    .eq("id", assetId)
    .eq("event_id", eventId);

  if (error && isMissingSchemaError(error)) {
    const fallback: Record<string, unknown> = { updated_at: now };
    if (fields.tags !== undefined) fallback.tags = fields.tags;
    if (Object.keys(fallback).length === 1) return true;
    ({ error } = await supabase
      .from("event_assets")
      .update(fallback)
      .eq("id", assetId)
      .eq("event_id", eventId));
  }

  return !error;
}

export async function ensurePlanAssetRow(
  eventId: string,
  assetType: string,
  planLabel: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("event_assets")
    .select("id")
    .eq("event_id", eventId)
    .eq("asset_type", assetType)
    .eq("plan_label", planLabel)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const now = new Date().toISOString();
  let { data, error } = await supabase
    .from("event_assets")
    .insert({
      event_id: eventId,
      asset_type: assetType,
      status: "placeholder",
      ai_generated: false,
      is_custom: true,
      plan_label: planLabel,
      plan_status: "needed",
      updated_at: now,
    })
    .select("id")
    .single();

  if (error && isMissingSchemaError(error)) {
    ({ data, error } = await supabase
      .from("event_assets")
      .insert({
        event_id: eventId,
        asset_type: assetType,
        status: "placeholder",
        ai_generated: false,
      })
      .select("id")
      .single());
  }

  if (error || !data) return null;
  return data.id as string;
}

export async function saveStyleMemoryEntry(input: {
  organizationId: string;
  sourceEventId: string;
  sourceAssetId: string;
  eventTitle: string;
  assetType: string;
  style: StyleMemorySnapshot;
}): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("organization_creative_style_memory").insert({
    organization_id: input.organizationId,
    source_event_id: input.sourceEventId,
    source_asset_id: input.sourceAssetId,
    event_title: input.eventTitle,
    asset_type: input.assetType,
    style: input.style,
    approved_at: new Date().toISOString(),
  });

  if (error && isMissingSchemaError(error)) {
    return true;
  }

  return !error;
}
