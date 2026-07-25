import { BillingCancelPlanContent } from "@/components/settings-v2/BillingSubPages";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";

export const metadata = {
  title: "Cancel Plan",
};

export default async function BillingCancelPlanPage() {
  const ctx = await getSettingsBillingContext();

  return (
    <BillingCancelPlanContent
      isFoundingPartner={ctx.isFoundingPartner}
      stripeConfigured={ctx.stripeConfigured}
      hasStripeCustomer={ctx.hasStripeCustomer}
    />
  );
}
