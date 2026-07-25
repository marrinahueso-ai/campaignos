import { BillingManagePlanContent } from "@/components/settings-v2/BillingSubPages";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";

export const metadata = {
  title: "Manage Plan",
};

export default async function BillingManagePlanPage() {
  const ctx = await getSettingsBillingContext();

  return (
    <BillingManagePlanContent
      isFoundingPartner={ctx.isFoundingPartner}
      planLabel={ctx.planLabel}
      currentPlanId={ctx.currentPlanId}
      stripeConfigured={ctx.stripeConfigured}
      hasStripeCustomer={ctx.hasStripeCustomer}
    />
  );
}
