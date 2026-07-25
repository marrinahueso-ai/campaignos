import { BillingPlanContent } from "@/components/settings-v2/BillingPlanContent";
import { getOrgAiCreditsWidgetData } from "@/lib/ai/credits";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Billing & Plan",
};

export default async function BillingPlanSettingsPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;
  const aiCredits = organization
    ? await getOrgAiCreditsWidgetData(organization.id)
    : null;

  return (
    <BillingPlanContent
      planLabel={isFoundingPartner ? "Founding Partner" : "Professional"}
      isFoundingPartner={isFoundingPartner}
      renewalLabel={null}
      aiCredits={aiCredits}
    />
  );
}
