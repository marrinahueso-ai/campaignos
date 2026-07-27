import { BillingPlanContent } from "@/components/settings-v2/BillingPlanContent";
import { getOrgAiCreditsWidgetData } from "@/lib/ai/credits";
import { getOrgAiUsageBreakdown } from "@/lib/ai/usage-breakdown";
import { getOrgCapacityUsage } from "@/lib/billing/capacity-usage";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
import { billingEaseViewFromParam } from "@/lib/billing/settings-ease-billing-view";
import { getOrgStripeInvoices } from "@/lib/billing/stripe-invoices";
import { getOrgStripeBillingDisplay } from "@/lib/billing/stripe-payment-summary";

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
  const [
    aiCredits,
    capacityUsage,
    aiUsageBreakdown,
    stripeInvoices,
    stripeDisplay,
  ] = await Promise.all([
    ctx.organization
      ? getOrgAiCreditsWidgetData(ctx.organization.id)
      : Promise.resolve(null),
    ctx.organization && ctx.billing
      ? getOrgCapacityUsage(ctx.organization.id, ctx.billing)
      : Promise.resolve([]),
    ctx.organization
      ? getOrgAiUsageBreakdown(ctx.organization.id)
      : Promise.resolve(null),
    ctx.stripeConfigured && ctx.billing?.stripeCustomerId
      ? getOrgStripeInvoices(ctx.billing.stripeCustomerId)
      : Promise.resolve([]),
    ctx.stripeConfigured
      ? getOrgStripeBillingDisplay({
          stripeCustomerId: ctx.billing?.stripeCustomerId,
          stripeSubscriptionId: ctx.billing?.stripeSubscriptionId,
        })
      : Promise.resolve({
          cardLabel: null,
          billingEmail: null,
          renewsOnLabel: null,
        }),
  ]);

  const params = await searchParams;
  const view = billingEaseViewFromParam(
    first(params.view) ?? first(params.tab),
  );
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

  return (
    <BillingPlanContent
      view={view}
      planLabel={ctx.planLabel}
      isFoundingPartner={ctx.isFoundingPartner}
      aiCredits={aiCredits}
      billing={ctx.billing}
      stripeConfigured={ctx.stripeConfigured}
      hasStripeCustomer={ctx.hasStripeCustomer}
      currentPlanId={ctx.currentPlanId}
      trialEligible={ctx.trialEligible}
      checkoutFlash={checkoutFlash}
      capacityUsage={capacityUsage}
      aiUsageBreakdown={aiUsageBreakdown}
      stripeInvoices={stripeInvoices}
      stripeDisplay={stripeDisplay}
    />
  );
}
