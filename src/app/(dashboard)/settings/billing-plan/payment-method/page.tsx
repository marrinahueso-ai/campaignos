import { BillingPaymentMethodContent } from "@/components/settings-v2/BillingSubPages";
import { isOrganizationBillingExempt } from "@/lib/auth/founding-access";
import { getLatestOrganization } from "@/lib/organizations/queries";

export const metadata = {
  title: "Payment Method",
};

export default async function BillingPaymentMethodPage() {
  const organization = await getLatestOrganization();
  const isFoundingPartner = organization
    ? isOrganizationBillingExempt(organization)
    : false;

  return <BillingPaymentMethodContent isFoundingPartner={isFoundingPartner} />;
}
