import { BillingManagePlanContent } from "@/components/settings-v2/BillingSubPages";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Manage Plan",
};

export default async function BillingManagePlanPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return (
    <BillingManagePlanContent
      isFoundingPartner={isFoundingPartner}
      planLabel={isFoundingPartner ? "Founding Partner" : "Professional"}
    />
  );
}
