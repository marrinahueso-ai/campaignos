import { BillingHistoryContent } from "@/components/settings-v2/BillingSubPages";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";

export const metadata = {
  title: "Billing History",
};

export default async function BillingHistoryPage() {
  const ctx = await getSettingsBillingContext();

  return (
    <BillingHistoryContent
      isFoundingPartner={ctx.isFoundingPartner}
      stripeConfigured={ctx.stripeConfigured}
      hasStripeCustomer={ctx.hasStripeCustomer}
    />
  );
}
