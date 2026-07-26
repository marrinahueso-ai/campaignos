import { CreateWithAiLanding } from "@/components/create-with-ai/CreateWithAiLanding";
import { hasPermission } from "@/lib/access-templates/effective-access";
import { isCampaignBuilderV2Enabled } from "@/lib/campaign-builder-v2/feature-flag";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Create with AI",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CreateWithAiPage() {
  const organization = await getLatestOrganization();
  const canUseSocial =
    isCampaignBuilderV2Enabled() && (await hasPermission("upload_artwork"));

  return (
    <CreateWithAiLanding
      organizationName={organization?.name ?? null}
      canUseSocial={canUseSocial}
      socialHref="/create-with-ai/social"
    />
  );
}
