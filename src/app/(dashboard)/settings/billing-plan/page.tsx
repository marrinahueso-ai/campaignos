import { BillingPlanContent } from "@/components/settings-v2/BillingPlanContent";
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

  return (
    <BillingPlanContent
      planLabel={isFoundingPartner ? "Founding Partner" : "Professional"}
      isFoundingPartner={isFoundingPartner}
      renewalLabel={isFoundingPartner ? null : "Renews Aug 12, 2026"}
    />
  );
}
