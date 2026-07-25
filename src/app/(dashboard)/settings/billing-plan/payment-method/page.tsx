import { BillingPaymentMethodContent } from "@/components/settings-v2/BillingSubPages";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";

export const metadata = {
  title: "Payment Method",
};

export default async function BillingPaymentMethodPage() {
  const ctx = await getSettingsBillingContext();

  return (
    <BillingPaymentMethodContent
      isFoundingPartner={ctx.isFoundingPartner}
      stripeConfigured={ctx.stripeConfigured}
      hasStripeCustomer={ctx.hasStripeCustomer}
    />
  );
}
