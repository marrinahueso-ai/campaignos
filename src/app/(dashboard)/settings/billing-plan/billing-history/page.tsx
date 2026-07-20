import { BillingHistoryContent } from "@/components/settings-v2/BillingSubPages";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Billing History",
};

export default async function BillingHistoryPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return <BillingHistoryContent isFoundingPartner={isFoundingPartner} />;
}
