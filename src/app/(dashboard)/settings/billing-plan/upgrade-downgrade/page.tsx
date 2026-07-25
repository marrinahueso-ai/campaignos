import { BillingUpgradeDowngradeContent } from "@/components/settings-v2/BillingSubPages";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";

export const metadata = {
  title: "Upgrade / Downgrade",
};

export default async function BillingUpgradeDowngradePage() {
  const ctx = await getSettingsBillingContext();

  return (
    <BillingUpgradeDowngradeContent
      isFoundingPartner={ctx.isFoundingPartner}
      currentPlanId={ctx.currentPlanId}
      stripeConfigured={ctx.stripeConfigured}
      trialEligible={ctx.trialEligible}
    />
  );
}
