import "server-only";

import { cache } from "react";
import { getCampaignBuilderCampaignOptions } from "@/lib/campaign-builder-v2/campaign-options";
import { getBrandKitItems } from "@/lib/creative-assets/queries";
import { getLatestOrganization } from "@/lib/organizations/queries";
import { mapBrandAssetsRow } from "@/lib/organizations/mappers";
import { createClient } from "@/lib/supabase/server";
import type { PlaybookOption } from "@/lib/campaign-builder-v2/types";
import type { BrandKitItem } from "@/lib/creative-assets/types";
import type { BrandAssets, BrandAssetsRow, Event } from "@/types";

/** Per-request cached campaign name dropdown options. */
export const getCachedCampaignBuilderCampaignOptions = cache(
  async (organizationId: string | null, currentEvent: Event) =>
    getCampaignBuilderCampaignOptions(organizationId, currentEvent),
);

/**
 * Lean playbook dropdown — id + name only.
 * Skips step-count aggregation used by the full playbooks settings list.
 */
export const getCachedCampaignBuilderPlaybookOptions = cache(
  async (organizationId: string | null): Promise<PlaybookOption[]> => {
    const supabase = await createClient();

    let query = supabase
      .from("communication_playbooks")
      .select("id, name")
      .eq("is_archived", false)
      .order("name", { ascending: true });

    if (organizationId) {
      query = query.or(
        `organization_id.eq.${organizationId},and(organization_id.is.null,is_system.eq.true)`,
      );
    } else {
      query = query.eq("is_system", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error(
        "Failed to fetch campaign builder playbooks:",
        error.message,
      );
      return [];
    }

    let rows = (data ?? []) as Array<{ id: string; name: string }>;

    if (organizationId) {
      const { data: hidden, error: hiddenError } = await supabase
        .from("organization_hidden_playbooks")
        .select("playbook_id")
        .eq("organization_id", organizationId);

      if (!hiddenError && hidden?.length) {
        const hiddenIds = new Set(
          hidden.map((row) => row.playbook_id as string),
        );
        rows = rows.filter((row) => !hiddenIds.has(row.id));
      }
    }

    return rows.map((row) => ({ id: row.id, name: row.name }));
  },
);

export interface CampaignBuilderBrandSetup {
  brandAssets: BrandAssets | null;
  brandKitItems: BrandKitItem[];
  schoolColors: {
    primary: string | null;
    secondary: string | null;
  };
}

/**
 * Brand logos + colors for Create with AI — skips calendar_imports that
 * `getSchoolProfile` always loads.
 */
export const getCachedCampaignBuilderBrandSetup = cache(
  async (): Promise<CampaignBuilderBrandSetup> => {
    const organization = await getLatestOrganization();
    if (!organization) {
      return {
        brandAssets: null,
        brandKitItems: [],
        schoolColors: { primary: null, secondary: null },
      };
    }

    const supabase = await createClient();
    const [{ data: brandData }, brandKitItems] = await Promise.all([
      supabase
        .from("brand_assets")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getBrandKitItems(organization.id),
    ]);

    const brandAssets = brandData
      ? mapBrandAssetsRow(brandData as BrandAssetsRow)
      : null;

    return {
      brandAssets,
      brandKitItems,
      schoolColors: {
        primary: brandAssets?.primaryColor ?? null,
        secondary: brandAssets?.secondaryColor ?? null,
      },
    };
  },
);
