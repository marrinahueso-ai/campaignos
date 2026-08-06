import "server-only";

import { buildCampaignBuilderLogoOptions } from "@/lib/artwork-v2/setup-logos";
import { getBrandKitItems } from "@/lib/creative-assets/queries";
import { getSchoolProfile } from "@/lib/organizations/queries";

/** Logo choice from Setup brand kit (PTO / school / extras). */
export type FlyerComposerLogoOption = {
  id: string;
  label: string;
  url: string;
};

/** JSON shape returned by GET /api/flyer-composer/brand-kit */
export type FlyerComposerBrandKitResponse = {
  /** Active org id — scopes flyer localStorage drafts (multi-tenant). */
  organizationId: string;
  organizationShortName: string;
  primaryColor: string;
  accentColor: string;
  fontStyle: string;
  mascotLabel: string | null;
  ptoLogoUploaded: boolean;
  schoolLogoUploaded: boolean;
  ptoLogoUrl: string | null;
  schoolLogoUrl: string | null;
  /** Setup logos the volunteer can pick for the Brand Kit block. */
  logos: FlyerComposerLogoOption[];
  brandKitReady: boolean;
};

function shortenOrganizationName(name: string | null): string {
  if (!name?.trim()) return "Your organization";
  return name
    .trim()
    .replace(/\s+Elementary\s+/i, " ")
    .replace(/\s+Middle\s+/i, " ")
    .replace(/\s+High\s+/i, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function getFlyerComposerBrandKit(): Promise<FlyerComposerBrandKitResponse | null> {
  const profile = await getSchoolProfile();
  if (!profile?.organization?.id) return null;

  const organization = profile.organization;
  const brandAssets = profile.brandAssets;
  const primaryColor = brandAssets?.primaryColor?.trim() || "#2F4A3C";
  const accentColor = brandAssets?.secondaryColor?.trim() || "#6b9080";
  const ptoLogoUrl = brandAssets?.ptoLogo ?? null;
  const schoolLogoUrl = brandAssets?.schoolLogo ?? null;

  const brandKitItems = await getBrandKitItems(organization.id);
  const logos = buildCampaignBuilderLogoOptions(brandAssets, brandKitItems).map(
    (option) => ({
      id: option.id,
      label: option.label,
      url: option.url,
    }),
  );

  return {
    organizationId: organization.id,
    organizationShortName: shortenOrganizationName(organization.name),
    primaryColor,
    accentColor,
    fontStyle: brandAssets?.fontFamily?.trim() || "Modern",
    mascotLabel: organization.mascot?.trim() || null,
    ptoLogoUploaded: Boolean(ptoLogoUrl),
    schoolLogoUploaded: Boolean(schoolLogoUrl),
    ptoLogoUrl,
    schoolLogoUrl,
    logos,
    brandKitReady: Boolean(
      brandAssets?.primaryColor?.trim() ||
        ptoLogoUrl ||
        schoolLogoUrl ||
        logos.length > 0,
    ),
  };
}
