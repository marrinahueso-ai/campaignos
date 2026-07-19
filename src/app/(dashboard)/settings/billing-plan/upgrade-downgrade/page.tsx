import { BillingUpgradeDowngradeContent } from "@/components/settings-v2/BillingSubPages";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Upgrade / Downgrade",
};

export default async function BillingUpgradeDowngradePage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return (
    <BillingUpgradeDowngradeContent isFoundingPartner={isFoundingPartner} />
  );
}
