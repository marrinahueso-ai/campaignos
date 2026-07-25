import { BillingPlanContent } from "@/components/settings-v2/BillingPlanContent";
import { getOrgAiCreditsWidgetData } from "@/lib/ai/credits";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
import { planById } from "@/lib/billing/plan-catalog";

export const metadata = {
  title: "Billing & Plan",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function BillingPlanSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await getSettingsBillingContext();
  const aiCredits = ctx.organization
    ? await getOrgAiCreditsWidgetData(ctx.organization.id)
    : null;

  const params = await searchParams;
  const checkout = first(params.checkout);
  const reserve = first(params.reserve);
  let checkoutFlash: string | null = null;
  if (checkout === "success") {
    checkoutFlash = "Checkout complete — your plan will update in a moment.";
  } else if (reserve === "success") {
    checkoutFlash =
      "AI Reserve purchase complete — credits will appear after Stripe confirms.";
  } else if (checkout === "canceled" || reserve === "canceled") {
    checkoutFlash = "Checkout canceled — no charges were made.";
  }

  const paidId = ctx.billing
    ? paidPlanIdFromTier(ctx.billing.planTier)
    : null;

  return (
    <BillingPlanContent
      planLabel={ctx.planLabel}
      isFoundingPartner={ctx.isFoundingPartner}
      renewalLabel={
        ctx.billing?.subscriptionStatus === "active" && paidId
          ? `${planById(paidId).displayName} · active`
          : null
      }
      aiCredits={aiCredits}
      billing={ctx.billing}
      stripeConfigured={ctx.stripeConfigured}
      checkoutFlash={checkoutFlash}
    />
  );
}
