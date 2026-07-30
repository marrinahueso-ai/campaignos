import "server-only";

import { getSchoolProfile } from "@/lib/organizations/queries";

/** JSON shape returned by GET /api/flyer-composer/brand-kit */
export type FlyerComposerBrandKitResponse = {
  organizationShortName: string;
  primaryColor: string;
  accentColor: string;
  fontStyle: string;
  mascotLabel: string | null;
  ptoLogoUploaded: boolean;
  schoolLogoUploaded: boolean;
  ptoLogoUrl: string | null;
  schoolLogoUrl: string | null;
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
  const organization = profile?.organization;
  if (!organization?.id) return null;

  const brandAssets = profile.brandAssets;
  const primaryColor = brandAssets?.primaryColor?.trim() || "#2F4A3C";
  const accentColor = brandAssets?.secondaryColor?.trim() || "#6b9080";
  const ptoLogoUrl = brandAssets?.ptoLogo ?? null;
  const schoolLogoUrl = brandAssets?.schoolLogo ?? null;

  return {
    organizationShortName: shortenOrganizationName(organization.name),
    primaryColor,
    accentColor,
    fontStyle: brandAssets?.fontFamily?.trim() || "Modern",
    mascotLabel: organization.mascot?.trim() || null,
    ptoLogoUploaded: Boolean(ptoLogoUrl),
    schoolLogoUploaded: Boolean(schoolLogoUrl),
    ptoLogoUrl,
    schoolLogoUrl,
    brandKitReady: Boolean(
      brandAssets?.primaryColor?.trim() || ptoLogoUrl || schoolLogoUrl,
    ),
  };
}
