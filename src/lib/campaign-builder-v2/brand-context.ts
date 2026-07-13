import "server-only";

import { cache } from "react";
import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import { getBrandKitItems } from "@/lib/creative-assets/queries";
import type { BrandKitItem } from "@/lib/creative-assets/types";
import { resolveAssetImageUrl } from "@/lib/event-workspace/storage";
import { NO_BRAND_KIT_GUIDANCE } from "@/lib/campaign-builder-v2/brand-kit";
import { getLatestOrganization, getSchoolProfile } from "@/lib/organizations/queries";

export interface BrandContextForGeneration {
  guidance: string | null;
  logoUrls: string[];
  organizationName: string | null;
  ptoName: string | null;
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

export function buildBrandGuidanceBlock(input: {
  items: BrandKitItem[];
  organizationName?: string | null;
  ptoName?: string | null;
  includeOrganizationNames?: boolean;
}): string | null {
  const lines: string[] = [];

  if (input.includeOrganizationNames) {
    if (input.organizationName?.trim()) {
      lines.push(`Organization: ${input.organizationName.trim()}`);
    }
    if (input.ptoName?.trim()) {
      lines.push(`PTO name: ${input.ptoName.trim()}`);
    }
  }

  for (const item of input.items) {
    if (item.category === "color" && item.valueText?.trim()) {
      lines.push(`Color — ${item.label}: ${item.valueText.trim()}`);
    }
    if (item.category === "font" && item.valueText?.trim()) {
      lines.push(`Font — ${item.label}: ${item.valueText.trim()}`);
    }
    if (item.category === "brand_voice" && item.valueText?.trim()) {
      lines.push(`Brand voice: ${item.valueText.trim()}`);
    }
    if (
      (item.category === "school_logo" || item.category === "pto_logo") &&
      item.label?.trim()
    ) {
      lines.push(
        `${item.category === "school_logo" ? "School logo" : "PTO logo"}: include as a visual element from the attached reference — do not render the logo label as text.`,
      );
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
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

  if (!useBrandKit) {
    return {
      guidance: NO_BRAND_KIT_GUIDANCE,
      logoUrls: [],
      organizationName,
      ptoName,
    };
  }

  if (!organization?.id) {
    return {
      guidance: null,
      logoUrls: buildCampaignBuilderLogoOptions(schoolProfile?.brandAssets).map(
        (option) => option.url,
      ),
      organizationName,
      ptoName,
    };
  }

  const items = await getBrandKitItems(organization.id);
  const kitLogoUrls = resolveBrandKitLogoUrls(items);
  const profileLogoUrls = buildCampaignBuilderLogoOptions(
    schoolProfile?.brandAssets,
    items,
  ).map((option) => option.url);
  const logoUrls = [...new Set([...kitLogoUrls, ...profileLogoUrls])];

  return {
    guidance: buildBrandGuidanceBlock({
      items,
      organizationName,
      ptoName,
      includeOrganizationNames: false,
    }),
    logoUrls,
    organizationName,
    ptoName,
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
