import { SettingsEaseOrganization } from "@/components/settings-v2/SettingsEaseOrganization";
import { getPostingPreferencesSettingsData } from "@/lib/organizations/posting-preferences-actions";
import type { BrandAssets, Organization } from "@/types";

interface OrganizationSettingsContentProps {
  organization: Organization;
  brandAssets: BrandAssets | null;
}

export async function OrganizationSettingsContent({
  organization,
  brandAssets,
}: OrganizationSettingsContentProps) {
  const postingPreferences = await getPostingPreferencesSettingsData();

  return (
    <SettingsEaseOrganization
      organization={organization}
      brandAssets={brandAssets}
      postingInput={postingPreferences?.input ?? null}
    />
  );
}
