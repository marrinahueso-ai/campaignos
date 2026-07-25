import { BillingPlanContent } from "@/components/settings-v2/BillingPlanContent";
import { billingPlanTabFromParam } from "@/components/settings-v2/BillingPlanTabs";
import { getOrgAiCreditsWidgetData } from "@/lib/ai/credits";
import { getOrgAiCreditLedgerRecent } from "@/lib/ai/credit-ledger";
import { getOrgAiUsageBreakdown } from "@/lib/ai/usage-breakdown";
import { getOrgCapacityUsage } from "@/lib/billing/capacity-usage";
import { paidPlanIdFromTier } from "@/lib/billing/entitlements";
import { getSettingsBillingContext } from "@/lib/billing/settings-billing";
import { planById } from "@/lib/billing/plan-catalog";
import { getOrgStripeInvoices } from "@/lib/billing/stripe-invoices";

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
  const [aiCredits, capacityUsage, aiCreditLedger, aiUsageBreakdown, stripeInvoices] =
    await Promise.all([
      ctx.organization
        ? getOrgAiCreditsWidgetData(ctx.organization.id)
        : Promise.resolve(null),
      ctx.organization && ctx.billing
        ? getOrgCapacityUsage(ctx.organization.id, ctx.billing)
        : Promise.resolve([]),
      ctx.organization
        ? getOrgAiCreditLedgerRecent(ctx.organization.id)
        : Promise.resolve([]),
      ctx.organization
        ? getOrgAiUsageBreakdown(ctx.organization.id)
        : Promise.resolve(null),
      ctx.stripeConfigured && ctx.billing?.stripeCustomerId
        ? getOrgStripeInvoices(ctx.billing.stripeCustomerId)
        : Promise.resolve([]),
    ]);

  const params = await searchParams;
  const tab = billingPlanTabFromParam(first(params.tab));
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
      tab={tab}
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
      hasStripeCustomer={ctx.hasStripeCustomer}
      currentPlanId={ctx.currentPlanId}
      trialEligible={ctx.trialEligible}
      checkoutFlash={checkoutFlash}
      capacityUsage={capacityUsage}
      aiCreditLedger={aiCreditLedger}
      aiUsageBreakdown={aiUsageBreakdown}
      stripeInvoices={stripeInvoices}
    />
  );
}
