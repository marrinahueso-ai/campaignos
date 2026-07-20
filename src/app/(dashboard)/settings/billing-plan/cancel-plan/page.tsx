import { BillingCancelPlanContent } from "@/components/settings-v2/BillingSubPages";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Cancel Plan",
};

export default async function BillingCancelPlanPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return <BillingCancelPlanContent isFoundingPartner={isFoundingPartner} />;
}
