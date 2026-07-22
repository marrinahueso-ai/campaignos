import "server-only";

import { cache } from "react";
import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import { getBrandKitItems } from "@/lib/creative-assets/queries";
import type { BrandKitItem } from "@/lib/creative-assets/types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { buildBrandGuidanceBlock } from "@/lib/campaign-builder-v2/brand-guidance";
import { NO_BRAND_KIT_GUIDANCE } from "@/lib/campaign-builder-v2/brand-kit";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";

export { buildBrandGuidanceBlock } from "@/lib/campaign-builder-v2/brand-guidance";

export interface BrandContextForGeneration {
  guidance: string | null;
  logoUrls: string[];
  organizationName: string | null;
  ptoName: string | null;
  mascot: string | null;
}

function resolveBrandKitLogoUrls(items: BrandKitItem[]): string[] {
  const urls: string[] = [];

  for (const item of items) {
    if (
      (item.category === "school_logo" || item.category === "pto_logo") &&
      item.storagePath?.trim()
    ) {
      const url = resolveAssetImageUrl(item.storagePath);
      if (url) {
        urls.push(url);
      }
    }
  }

  return urls;
}

async function resolveBrandContextForGenerationUncached(
  useBrandKit: boolean,
): Promise<BrandContextForGeneration> {
  const [organization, schoolProfile] = await Promise.all([
    getLatestOrganization(),
    getSchoolProfile(),
  ]);

  const organizationName = organization?.name ?? schoolProfile?.organization?.name ?? null;
  const ptoName = organizationName;
  const mascot = organization?.mascot ?? schoolProfile?.organization?.mascot ?? null;
  const brandAssets = schoolProfile?.brandAssets ?? null;

  if (!useBrandKit) {
    return {
      guidance: NO_BRAND_KIT_GUIDANCE,
      logoUrls: [],
      organizationName,
      ptoName,
      mascot: null,
    };
  }

  if (!organization?.id) {
    const logoUrls = buildCampaignBuilderLogoOptions(brandAssets).map(
      (option) => option.url,
    );
    return {
      guidance: buildBrandGuidanceBlock({
        items: [],
        organizationName,
        ptoName,
        includeOrganizationNames: false,
        primaryColor: brandAssets?.primaryColor,
        secondaryColor: brandAssets?.secondaryColor,
        mascot,
        hasPtoLogo: Boolean(brandAssets?.ptoLogo),
        hasSchoolLogo: Boolean(brandAssets?.schoolLogo),
      }),
      logoUrls,
      organizationName,
      ptoName,
      mascot,
    };
  }

  const items = await getBrandKitItems(organization.id);
  const kitLogoUrls = resolveBrandKitLogoUrls(items);
  const profileLogoUrls = buildCampaignBuilderLogoOptions(brandAssets, items).map(
    (option) => option.url,
  );
  const logoUrls = [...new Set([...kitLogoUrls, ...profileLogoUrls])];

  return {
    guidance: buildBrandGuidanceBlock({
      items,
      organizationName,
      ptoName,
      includeOrganizationNames: false,
      primaryColor: brandAssets?.primaryColor,
      secondaryColor: brandAssets?.secondaryColor,
      mascot,
      hasPtoLogo: Boolean(brandAssets?.ptoLogo),
      hasSchoolLogo: Boolean(brandAssets?.schoolLogo),
    }),
    logoUrls,
    organizationName,
    ptoName,
    mascot,
  };
}

export async function resolveSelectedLogoForGeneration(input: {
  selectedLogoId: string | null;
  includeLogoInArtwork: boolean;
  uploadedLogoUrl?: string | null;
  uploadedLogoLabel?: string | null;
}): Promise<{ url: string | null; label: string | null }> {
  if (!input.includeLogoInArtwork || !input.selectedLogoId) {
    return { url: null, label: null };
  }

  if (input.uploadedLogoUrl?.trim()) {
    return {
      url: input.uploadedLogoUrl.trim(),
      label: input.uploadedLogoLabel?.trim() || "Uploaded logo",
    };
  }

  const [organization, schoolProfile] = await Promise.all([
    getLatestOrganization(),
    getSchoolProfile(),
  ]);

  const brandKitItems = organization?.id
    ? await getBrandKitItems(organization.id)
    : [];
  const options = buildCampaignBuilderLogoOptions(
    schoolProfile?.brandAssets,
    brandKitItems,
  );
  const selected = options.find((option) => option.id === input.selectedLogoId);

  return {
    url: selected?.url ?? null,
    label: selected?.label ?? null,
  };
}

/** Per-request cached brand kit + logo resolution for AI generation. */
export const resolveBrandContextForGeneration = cache(
  resolveBrandContextForGenerationUncached,
);
