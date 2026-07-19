import {
  getCampaignAssetsForEvent,
  getInspirationAssets,
} from "@/lib/creative-assets/queries";
import {
  getLatestOrganization,
  getSchoolProfile,
} from "@/lib/organizations/queries";
import { getAiProfileByOrganizationId } from "@/lib/organization-intelligence/queries";
import { getEventPlaybookData } from "@/lib/playbooks/queries";
import { getEventWorkspaceData } from "@/lib/event-workspace/queries";
import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/creative-assets/schema-errors";
import { mapStyleMemoryRow } from "@/lib/creative-director/mappers";
import type { StyleMemoryRow } from "@/lib/creative-director/types";
import type { CreativeDirectorContext } from "@/lib/creative-director/types";
import type { Event } from "@/types";
import type { BrandAssets } from "@/types";

function extractBrandColors(brandAssets: BrandAssets | null): string[] {
  if (!brandAssets) return [];
  const colors: string[] = [];
  if (brandAssets.primaryColor) colors.push(brandAssets.primaryColor);
  if (brandAssets.secondaryColor) colors.push(brandAssets.secondaryColor);
  return colors;
}

async function loadStyleMemory(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_creative_style_memory")
    .select("*")
    .eq("organization_id", organizationId)
    .order("approved_at", { ascending: false })
    .limit(12);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    return [];
  }

  return ((data ?? []) as StyleMemoryRow[]).map(mapStyleMemoryRow);
}

export async function buildCreativeDirectorContext(
  event: Event,
): Promise<CreativeDirectorContext> {
  const organization = await getLatestOrganization();
  // Assets must be full rows (generation_prompt / settings / ai_review).
  // Event workspace lean selects omit those for UI loaders — never reuse them here.
  const [workspace, playbook, inspirationAssets, schoolProfile, styleMemory, assets] =
    await Promise.all([
      getEventWorkspaceData(event.id),
      getEventPlaybookData(event.id),
      getInspirationAssets(),
      organization ? getSchoolProfile() : Promise.resolve(null),
      organization
        ? loadStyleMemory(organization.id)
        : Promise.resolve([]),
      getCampaignAssetsForEvent(event.id),
    ]);

  const profile = organization
    ? await getAiProfileByOrganizationId(organization.id)
    : null;

  return {
    event,
    organizationName: organization?.name ?? null,
    organizationVoice: profile?.organizationVoice ?? null,
    brandColors: extractBrandColors(
      (schoolProfile?.brandAssets as BrandAssets | null) ?? null,
    ),
    communications: workspace?.communications ?? [],
    playbookStepCount: playbook?.steps.length ?? 0,
    inspirationAssets,
    styleMemory,
    assets,
  };
}
