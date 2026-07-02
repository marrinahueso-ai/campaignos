import type {
  OrganizationGroundingFacts,
  SchoolSetupGroundingFacts,
} from "@/lib/ai-grounding/types";
import type { OrganizationAiProfile } from "@/types/organization-intelligence";
import type { Organization, SchoolProfile } from "@/types";

export function buildOrganizationGroundingFacts(input: {
  organization: Organization | null;
  profile: OrganizationAiProfile | null;
}): OrganizationGroundingFacts {
  const { organization, profile } = input;

  return {
    name: trimOrNull(organization?.name),
    district: trimOrNull(organization?.district),
    schoolYear: trimOrNull(organization?.schoolYear),
    mascot: trimOrNull(organization?.mascot),
    principal: trimOrNull(organization?.principal),
    schoolWebsite: trimOrNull(organization?.schoolWebsite),
    ptoWebsite: trimOrNull(organization?.ptoWebsite),
    organizationVoice: trimOrNull(profile?.organizationVoice),
    writingStyle: trimOrNull(profile?.writingStyle),
    audienceDefaults: trimOrNull(profile?.audienceDefaults),
    communicationPreferences: trimOrNull(profile?.communicationPreferences),
  };
}

export function buildSchoolSetupGroundingFacts(
  schoolProfile: SchoolProfile | null,
): SchoolSetupGroundingFacts {
  const brand = schoolProfile?.brandAssets ?? null;

  return {
    primaryColor: trimOrNull(brand?.primaryColor),
    secondaryColor: trimOrNull(brand?.secondaryColor),
    fontFamily: trimOrNull(brand?.fontFamily),
    hasPtoLogo: hasUploadedAsset(brand?.ptoLogo),
    hasSchoolLogo: hasUploadedAsset(brand?.schoolLogo),
  };
}

function hasUploadedAsset(path: string | null | undefined): boolean {
  return !!path?.trim();
}

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
