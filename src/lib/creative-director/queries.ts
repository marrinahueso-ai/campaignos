import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { createClient } from "@/lib/supabase/server";
import { buildCreativeDirectorContext } from "@/lib/creative-director/build-context";
import { buildCreativeBriefFromContext } from "@/lib/creative-director/build-brief";
import { buildAssetPlan } from "@/lib/creative-director/build-asset-plan";
import { mapCreativeBriefRow, mapStyleMemoryRow } from "@/lib/creative-director/mappers";
import type {
  CreativeBrief,
  CreativeDirectorData,
  StyleMemoryRow,
} from "@/lib/creative-director/types";
import type { CreativeBriefRow } from "@/lib/creative-director/types";
import type { Event } from "@/types";

export async function getCreativeBriefForEvent(
  eventId: string,
): Promise<{ brief: CreativeBrief | null; isAiEnhanced: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_creative_briefs")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return { brief: null, isAiEnhanced: false };
    console.error("Failed to fetch creative brief:", error.message);
    return { brief: null, isAiEnhanced: false };
  }

  if (!data) return { brief: null, isAiEnhanced: false };
  const mapped = mapCreativeBriefRow(data as CreativeBriefRow);
  return { brief: mapped.brief, isAiEnhanced: mapped.isAiEnhanced };
}

export async function getStyleMemoryForOrganization(
  organizationId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_creative_style_memory")
    .select("*")
    .eq("organization_id", organizationId)
    .order("approved_at", { ascending: false })
    .limit(12);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    console.error("Failed to fetch style memory:", error.message);
    return [];
  }

  return ((data ?? []) as StyleMemoryRow[]).map(mapStyleMemoryRow);
}

export async function getCreativeDirectorData(
  event: Event,
): Promise<CreativeDirectorData> {
  const context = await buildCreativeDirectorContext(event);
  const stored = await getCreativeBriefForEvent(event.id);
  const brief =
    stored.brief ?? buildCreativeBriefFromContext(context);
  const assetPlan = buildAssetPlan(context, brief);

  return {
    brief,
    briefIsAiEnhanced: stored.isAiEnhanced,
    assetPlan,
    styleMemory: context.styleMemory,
  };
}

export async function getCreativeDirectorContextForEvent(event: Event) {
  return buildCreativeDirectorContext(event);
}
